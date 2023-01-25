import { CloudWatchClient, DeleteAlarmsCommand, PutMetricAlarmCommand } from '@aws-sdk/client-cloudwatch';

const split = (value?: string) => value?.split(',');
const ALARM_ACTIONS = split(process.env.ALARM_ACTIONS);

const cloudWatch = new CloudWatchClient({});

export async function handler(event: any): Promise<void> {
  if (event.detail.errorCode) return;

  const alarmName = `${event.detail.requestParameters.functionName}/Errors`;

  switch (event.detail.eventName) {
    case 'CreateFunction20150331':
      await cloudWatch
        .send(new PutMetricAlarmCommand({
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
        }))
        .catch((reason) => console.error(JSON.stringify(reason)));
      break;

    case 'DeleteFunction20150331':
      await cloudWatch
        .send(new DeleteAlarmsCommand({
          AlarmNames: [
            alarmName,
          ],
        }))
        .catch((reason) => console.error(JSON.stringify(reason)));
      break;
  }
}
