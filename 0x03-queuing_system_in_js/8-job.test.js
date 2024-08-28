import sinon from 'sinon';
import { expect } from 'chai';
import { createQueue } from 'kue';
import createPushNotificationsJobs from './8-job.js';

describe('createPushNotificationsJobs', () => {
  const ret_s = sinon.spy(console);
  const kue = createQueue({ name: 'push_notification_code_test' });

  before(() => {
    kue.testMode.enter(true);
  });

  after(() => {
    kue.testMode.clear();
    kue.testMode.exit();
  });

  afterEach(() => {
    ret_s.log.resetHistory();
  });


  it('adds jobs to the queue with the correct type', (done) => {
    expect(kue.testMode.jobs.length).to.equal(0);
    const jobInfos = [
      {
        phoneNumber: '44556677889',
        message: 'Use the code 1982 to verify your account',
      },
      {
        phoneNumber: '98877665544',
        message: 'Use the code 1738 to verify your account',
      },
    ];
    createPushNotificationsJobs(jobInfos, kue);
    expect(kue.testMode.jobs.length).to.equal(2);
    expect(kue.testMode.jobs[0].data).to.deep.equal(jobInfos[0]);
    expect(kue.testMode.jobs[0].type).to.equal('push_notification_code_3');
    kue.process('push_notification_code_3', () => {
      expect(
        ret_s.log
          .calledWith('Notification job created:', kue.testMode.jobs[0].id)
      ).to.be.true;
      done();
    });
  });

  it('registers the progress event handler for a job', (done) => {
    kue.testMode.jobs[0].addListener('progress', () => {
      expect(
        ret_s.log
          .calledWith('Notification job', kue.testMode.jobs[0].id, '25% complete')
      ).to.be.true;
      done();
    });
    kue.testMode.jobs[0].emit('progress', 25);
  });

  it('registers the failed event handler for a job', (done) => {
    kue.testMode.jobs[0].addListener('failed', () => {
      expect(
        ret_s.log
          .calledWith('Notification job', kue.testMode.jobs[0].id, 'failed:', 'Failed to send')
      ).to.be.true;
      done();
    });
    kue.testMode.jobs[0].emit('failed', new Error('Failed to send'));
  });

  it('registers the complete event handler for a job', (done) => {
    kue.testMode.jobs[0].addListener('complete', () => {
      expect(
        ret_s.log
          .calledWith('Notification job', kue.testMode.jobs[0].id, 'completed')
      ).to.be.true;
      done();
    });
    kue.testMode.jobs[0].emit('complete');
  });
});
