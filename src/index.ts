import { CloudWatch } from 'aws-sdk';

const split = (value?: string) => value?.split(',');
const ALARM_ACTIONS = split(process.env.ALARM_ACTIONS);

export const cloudWatch = new CloudWatch();

export async function handler(event: any): Promise<void> {
  if (event.detail.errorCode) return;

  const alarmName = `${event.detail.requestParameters.functionName}/Errors`;

  switch (event.detail.eventName) {
    case 'CreateFunction20150331':
      await cloudWatch
        .putMetricAlarm({
          AlarmName: alarmName,
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
        .promise()
        .catch((reason) => console.error(JSON.stringify(reason)));
      break;

    case 'DeleteFunction20150331':
      await cloudWatch
        .deleteAlarms({
          AlarmNames: [
            alarmName,
          ],
        })
        .promise()
        .catch((reason) => console.error(JSON.stringify(reason)));
      break;
  }
}
