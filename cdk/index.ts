import { App, ArnFormat, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

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
      resourceName: '*',
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
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
