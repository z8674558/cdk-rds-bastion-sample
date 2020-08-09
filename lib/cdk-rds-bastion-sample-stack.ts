import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as secrets from '@aws-cdk/aws-secretsmanager';

const myIP = '0.0.0.0/0'; // IP address from which you want to connect to RDS
const rdsSecretName = 'rdsUserPass';

export class CdkRdsBastionSampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "vpc", {
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          name: "vpc-public-subnet",
          cidrMask: 24,
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          name: "vpc-private-subnet",
          cidrMask: 24,
          subnetType: ec2.SubnetType.PRIVATE
        }
      ]
    });

    //sg configuration
    const lambdaToDBGroup = new ec2.SecurityGroup(this, 'Lambda to DB Connection', {
      vpc
    });
    const DBGroup = new ec2.SecurityGroup(this, 'Proxy to DB Connection', {
      vpc
    });
    const bastionToDBGroup = new ec2.SecurityGroup(this, 'bastion to DB Connection', {
      vpc
    });
    DBGroup.addIngressRule(DBGroup, ec2.Port.tcp(3306), 'allow proxy to db');
    DBGroup.addIngressRule(lambdaToDBGroup, ec2.Port.tcp(3306), 'allow lambda to db');
    DBGroup.addIngressRule(bastionToDBGroup, ec2.Port.tcp(3306), 'allow bastion to db');
    bastionToDBGroup.addIngressRule(ec2.Peer.ipv4(myIP), ec2.Port.tcp(22));

    //create bastion to init/alter db schema
    const bastion = new ec2.BastionHostLinux(this, "bastion", {
      vpc: vpc,
      instanceName: "bastion",
      subnetSelection: {subnetType: ec2.SubnetType.PUBLIC},
      securityGroup: bastionToDBGroup,
    });

    bastion.instance.addUserData(
      "sudo echo 'GatewayPorts yes' >> /etc/ssh/sshd_config",
      "sudo service sshd restart",
    );

    bastion.allowSshAccessFrom(ec2.Peer.ipv4(myIP));

    const databaseUsername = 'admin';
    const databaseCredentialsSecret = new secrets.Secret(this, 'DBCredentialsSecret', {
      secretName: rdsSecretName,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: databaseUsername,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });

    // RDS instance
    const rdsInstance = new rds.DatabaseInstance(this, 'DBInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_5_7,
      }),
      masterUsername: databaseCredentialsSecret.secretValueFromJson('username').toString(),
      masterUserPassword: databaseCredentialsSecret.secretValueFromJson('password'),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      securityGroups: [DBGroup]
    });

    new cdk.CfnOutput(this, "publicDNS", {
      value: bastion.instance.instancePublicDnsName
    });

    new cdk.CfnOutput(this, "rdsEndpoint", {
      value: rdsInstance.dbInstanceEndpointAddress
    });

    new cdk.CfnOutput(this, "instanceID", {
      value: bastion.instanceId
    });
    new cdk.CfnOutput(this, "rdsSecretName", {
      value: rdsSecretName
    });
  }
}
