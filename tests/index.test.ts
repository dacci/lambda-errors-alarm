import { cloudWatch, handler } from '../src';

jest.mock('aws-sdk');

describe('Lambda handler', () => {
  it('Function created', async () => {
    cloudWatch.putMetricAlarm = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
    });
    cloudWatch.deleteAlarms = jest.fn();

    await handler({
      detail: {
        eventName: 'CreateFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch.putMetricAlarm).toBeCalled();
    expect(cloudWatch.deleteAlarms).not.toBeCalled();
  });

  it('Function deleted', async () => {
    cloudWatch.putMetricAlarm = jest.fn();
    cloudWatch.deleteAlarms = jest.fn().mockReturnValue({
      promise: () => Promise.resolve(),
    });

    await handler({
      detail: {
        eventName: 'DeleteFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch.putMetricAlarm).not.toBeCalled();
    expect(cloudWatch.deleteAlarms).toBeCalled();
  });

  it('Function updated', async () => {
    cloudWatch.putMetricAlarm = jest.fn();
    cloudWatch.deleteAlarms = jest.fn();

    await handler({
      detail: {
        eventName: 'UpdateFunction20150331',
        requestParameters: {
          functionName: 'functionName',
        },
      },
    });

    expect(cloudWatch.putMetricAlarm).not.toBeCalled();
    expect(cloudWatch.deleteAlarms).not.toBeCalled();
  });

  it('Failed event', async () => {
    cloudWatch.putMetricAlarm = jest.fn();
    cloudWatch.deleteAlarms = jest.fn();

    await handler({
      detail: {
        errorCode: 'AccessDenied',
      },
    });

    expect(cloudWatch.putMetricAlarm).not.toBeCalled();
    expect(cloudWatch.deleteAlarms).not.toBeCalled();
  });
});
