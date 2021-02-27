import { CloudWatch } from 'aws-sdk';

const split = (value?: string) => value ? value.split(',') : undefined;
const OK_ACTIONS = split(process.env.OK_ACTIONS);
const ALARM_ACTIONS = split(process.env.ALARM_ACTIONS);

export const cloudWatch = new CloudWatch();

export async function handler(event: any): Promise<any> {
  if (event.detail.errorCode) return;

  const alarmName = `${event.detail.requestParameters.functionName}/Errors`;

  switch (event.detail.eventName) {
    case 'CreateFunction20150331':
      return cloudWatch
        .putMetricAlarm({
          AlarmName: alarmName,
          OKActions: OK_ACTIONS,
          AlarmActions: ALARM_ACTIONS,
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Statistic: 'Sum',
          Dimensions: [
            {
              Name: 'FunctionName',
              Value: event.detail.requestParameters.functionName,
            },
          ],
          Period: 60,
          EvaluationPeriods: 1,
          Threshold: 0,
          ComparisonOperator: 'GreaterThanThreshold',
          TreatMissingData: 'notBreaching',
        })
        .promise();

    case 'DeleteFunction20150331':
      return cloudWatch
        .deleteAlarms({
          AlarmNames: [
            alarmName,
          ],
        })
        .promise();
  }
}
