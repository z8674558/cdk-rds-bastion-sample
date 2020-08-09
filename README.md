# cdk-rds-bastion-sample

This is a sample CDK stack for managing aws rds instance via a bastion host.
You can connect to RDS instance by setting up an SSH tunnel.

## How to connect

Test RDS connection by executing `connect.sh`. 
The script will create SSH tunnel for you, and send some MySQL queries to RDS instance.
You can check results for queries executed in `mysqlresult.txt`.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
