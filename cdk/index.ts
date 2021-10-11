import { App, Construct, Duration, RemovalPolicy, Stack } from '@aws-cdk/core';
import { Topic } from '@aws-cdk/aws-sns';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Architecture } from '@aws-cdk/aws-lambda';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { ComparisonOperator, TreatMissingData } from '@aws-cdk/aws-cloudwatch';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { Rule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { SnsAction } from '@aws-cdk/aws-cloudwatch-actions';

const app = new App();

const stack = new Stack(app, 'Stack', {
  stackName: 'lambda-errors-alarm',
});

function topicFromName(scope: Construct, id: string, key: string) {
  const topicName = scope.node.tryGetContext(key);
  if (!topicName) return;

  const topicArn = Stack.of(scope).formatArn({
    service: 'sns',
    resource: topicName,
  });

  return Topic.fromTopicArn(scope, id, topicArn);
}

const alarmTopic = topicFromName(stack, 'AlarmTopic', 'alarm-topic');
const okTopic = topicFromName(stack, 'OkTopic', 'ok-topic');

const handler = new NodejsFunction(stack, 'Handler', {
  entry: 'src/index.ts',
  bundling: {
    minify: true,
    sourceMap: true,
  },
  timeout: Duration.minutes(1),
  environment: {
    NODE_OPTIONS: '--enable-source-maps',
    ALARM_ACTIONS: alarmTopic?.topicArn || '',
    OK_ACTIONS: okTopic?.topicArn || '',
  },
  architecture: Architecture.ARM_64,
  maxEventAge: Duration.minutes(1),
  retryAttempts: 0,
});

handler.addToRolePolicy(new PolicyStatement({
  actions: [
    'cloudwatch:PutMetricAlarm',
    'cloudwatch:DeleteAlarms',
  ],
  resources: [
    stack.formatArn({
      service: 'cloudwatch',
      resource: 'alarm',
      sep: ':',
      resourceName: '*',
    }),
  ],
}));

const alarm = handler
  .metricErrors({
    period: Duration.minutes(1),
    statistic: 'Sum',
  })
  .createAlarm(handler, 'Alarm', {
    alarmName: `${handler.functionName}/Errors`,
    comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    threshold: 0,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });

if (alarmTopic) alarm.addAlarmAction(new SnsAction(alarmTopic));
if (okTopic) alarm.addOkAction(new SnsAction(okTopic));

new LogGroup(handler, 'LogGroup', {
  logGroupName: `/aws/lambda/${handler.functionName}`,
  retention: RetentionDays.ONE_DAY,
  removalPolicy: RemovalPolicy.DESTROY,
});

new Rule(stack, 'Rule', {
  eventPattern: {
    source: [
      'aws.lambda',
    ],
    detailType: [
      'AWS API Call via CloudTrail',
    ],
    detail: {
      'eventSource': [
        'lambda.amazonaws.com',
      ],
      'eventName': [
        'CreateFunction20150331',
        'DeleteFunction20150331',
      ],
    },
  },
  targets: [
    new LambdaFunction(handler),
  ],
});
