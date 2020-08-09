#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkRdsBastionSampleStack } from '../lib/cdk-rds-bastion-sample-stack';

const app = new cdk.App();
new CdkRdsBastionSampleStack(app, 'CdkRdsBastionSampleStack');
