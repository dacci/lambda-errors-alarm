import { CloudWatchClient, DeleteAlarmsCommand, PutMetricAlarmCommand } from '@aws-sdk/client-cloudwatch';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../src';

const cloudWatch = mockClient(CloudWatchClient);
beforeEach(() => {
  cloudWatch.reset();
});

describe('Lambda handler', () => {
  it('Function created', async () => {
    cloudWatch
      .on(PutMetricAlarmCommand)
      .resolves({});

    await handler({
      detail: {
        eventName: 'CreateFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch).toHaveReceivedCommand(PutMetricAlarmCommand);
    expect(cloudWatch).not.toHaveReceivedCommand(DeleteAlarmsCommand);
  });

  it('putMetricAlarm failed', async () => {
    cloudWatch
      .on(PutMetricAlarmCommand)
      .rejects();

    const result = await handler({
      detail: {
        eventName: 'CreateFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch).toHaveReceivedCommand(PutMetricAlarmCommand);
    expect(result).toBeUndefined();
  });

  it('Function deleted', async () => {
    cloudWatch
      .on(DeleteAlarmsCommand)
      .resolves({});

    await handler({
      detail: {
        eventName: 'DeleteFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch).not.toHaveReceivedCommand(PutMetricAlarmCommand);
    expect(cloudWatch).toHaveReceivedCommand(DeleteAlarmsCommand);
  });

  it('deleteAlarms failed', async () => {
    cloudWatch
      .on(DeleteAlarmsCommand)
      .rejects();

    const result = await handler({
      detail: {
        eventName: 'DeleteFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch).toHaveReceivedCommand(DeleteAlarmsCommand);
    expect(result).toBeUndefined();
  });

  it('Function updated', async () => {
    await handler({
      detail: {
        eventName: 'UpdateFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch).not.toHaveReceivedCommand(PutMetricAlarmCommand);
    expect(cloudWatch).not.toHaveReceivedCommand(DeleteAlarmsCommand);
  });

  it('Failed event', async () => {
    await handler({
      detail: {
        errorCode: 'AccessDenied',
      },
    });

    expect(cloudWatch).not.toHaveReceivedCommand(PutMetricAlarmCommand);
    expect(cloudWatch).not.toHaveReceivedCommand(DeleteAlarmsCommand);
  });
});
