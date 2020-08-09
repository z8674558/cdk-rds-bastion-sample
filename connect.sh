#!/bin/bash

STACK_INFO=`aws cloudformation describe-stacks \
  --stack-name CdkRdsBastionSampleStack \
  --output json `
BASTION_DNS=`echo $STACK_INFO | jq -r '.Stacks[].Outputs[] | select(.OutputKey == "publicDNS").OutputValue'`
RDS_ENDPOINT=`echo $STACK_INFO | jq -r '.Stacks[].Outputs[] | select(.OutputKey == "rdsEndpoint").OutputValue'`
INSTANCE_ID=`echo $STACK_INFO | jq -r '.Stacks[].Outputs[] | select(.OutputKey == "instanceID").OutputValue'`
RDS_SECRET_NAME=`echo $STACK_INFO | jq -r '.Stacks[].Outputs[] | select(.OutputKey == "rdsSecretName").OutputValue'`
yes | ssh-keygen -f ./tmp_key -t rsa -N ""
aws ec2-instance-connect send-ssh-public-key \
--instance-id $INSTANCE_ID \
--instance-os-user ec2-user \
--ssh-public-key 'file://./tmp_key.pub' \
--availability-zone us-east-1a
ssh -L 9999:$RDS_ENDPOINT:3306 ec2-user@$BASTION_DNS -i ./tmp_key -N &
PID=$!
RDS_USERNAME=`aws secretsmanager get-secret-value --secret-id $RDS_SECRET_NAME --query SecretString`
sleep 3
mysql -u admin -h 127.0.0.1 -pZzTLU4vH5WPjCP9F9KCpR96WGe29Wxwa --port 9999 \
-e 'CREATE DATABASE IF NOT EXISTS dev2; USE dev2;
CREATE TABLE IF NOT EXISTS people (name VARCHAR(20), age INT, id INT AUTO_INCREMENT PRIMARY KEY);
insert into people (name, age) values ("hi", 100);
SELECT * FROM people;' > mysqlresult.txt
kill $PID
echo 'done'