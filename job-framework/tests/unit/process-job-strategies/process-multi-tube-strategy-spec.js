'use strict';

var strategy = require('../../../src/process-job-strategies/process-multi-tube-strategy');

var logger = {
    fields: {
        name: 'dummy-log'
    },
    child: function() {
        return this;
    },
    trace: function() {},
    debug: function() {},
    info: function() {},
    warn: function() {},
    error: function() {},
    fatal: function() {},
    console: {
        trace: console.log,
        debug: console.log,
        info: console.log,
        warn: console.log,
        error: console.log,
        fatal: console.log
    }
};

describe('process-multi-tube-strategy.js', function() {
    describe('processQueue', function() {
        var called, worker, callback, jobProcessor, calledCount, maxCallCount;

        beforeEach(function () {
            called = false;
            calledCount = 1;
            maxCallCount = 2;

            worker = {
                logger: logger,
                metrics: logger,
                beanstalkJobTypeConfig: {tubename: 'multi-tube',
                    tubeDetails: [{ratio: 3, priority: {startValue: 1, endValue: 50}}, {ratio: 1, priority: {startValue: 51, endValue: 100}}]},
                readyToShutdown: false,
                paused: false,
                pauseDelayMillis: 1000,
                client: {
                    watch: jasmine.createSpy().andCallFake(function(tubename, callback) {
                        callback();
                    }),
                    ignore: jasmine.createSpy().andCallFake(function(tubename, callback) {
                        callback();
                    }),
                    reserve_with_timeout: jasmine.createSpy().andCallFake(function(timeout, callback){
                        callback(null, 1, {type: 'valid'});
                    })
                }
            };

            spyOn(global, 'setTimeout').andCallFake(function(callback, delay, arg) {
                    if (calledCount <= maxCallCount) {
                        calledCount++;
                        return callback(arg);
                    }

                    called = true;
                }
            );

            callback = function () {
                called = true;
            };

            jobProcessor = jasmine.createSpy().andCallFake(function(beanstalkJobId, tubeName, beanstalkJobPayload, callback) {
                callback();
            })
        });

        it('verify process paused if worker is paused before processing queue.', function() {
            worker.paused = true;

            runs(function() {
                strategy.processQueue.call(worker, jobProcessor, callback);
            });

            waitsFor(function() {return called;}, 'Done', 1000);

            runs(function() {
                expect(worker.readyToShutdown).toBeTruthy();
                expect(worker.client.watch).not.toHaveBeenCalled();
                expect(worker.client.reserve_with_timeout).not.toHaveBeenCalled();
            });
        });

        it('verify worker processing queue.', function() {
            runs(function() {
                strategy.processQueue.call(worker, jobProcessor, callback);
            });

            waitsFor(function() {return called;}, 'Done', 1000);

            runs(function() {
                expect(worker.readyToShutdown).toBeFalsy();
                expect(worker.client.watch.calls.length).toBe(1);
                expect(worker.client.reserve_with_timeout.calls.length).toBe(calledCount);
                expect(jobProcessor.calls.length).toBe(calledCount);
            });
        });

        it('verify processing queue is aborted if watch fails.', function() {
            worker.client.watch = jasmine.createSpy().andCallFake(function(tubename, callback) {
                callback('NO_WATCH');
            });

            runs(function() {
                strategy.processQueue.call(worker, jobProcessor, callback);
            });

            waitsFor(function() {return called;}, 'Done', 1000);

            runs(function() {
                expect(worker.readyToShutdown).toBeFalsy();
                expect(worker.client.watch.calls.length).toBe(1);
                expect(worker.client.reserve_with_timeout).not.toHaveBeenCalled();
                expect(jobProcessor).not.toHaveBeenCalled();
            });
        });
    });

    describe('processQueue-reserve-loop', function() {
        var called, worker, callback, jobProcessor, calledCount, maxCallCount;

        beforeEach(function () {
            called = false;
            calledCount = 1;
            maxCallCount = 5;

            worker = {
                logger: logger,
                metrics: logger,
                beanstalkJobTypeConfig: {tubename: 'multi-tube',
                    tubeDetails: [{ratio: 3, priority: {startValue: 1, endValue: 50}}, {ratio: 1, priority: {startValue: 51, endValue: 100}}]},
                readyToShutdown: false,
                paused: false,
                pauseDelayMillis: 1000,
                client: {
                    watch: jasmine.createSpy().andCallFake(function(tubename, callback) {
                        callback();
                    }),
                    ignore: jasmine.createSpy().andCallFake(function(tubename, callback) {
                        callback();
                    }),
                    reserve_with_timeout: jasmine.createSpy().andCallFake(function(timeout, callback){
                        callback(null, 1, {type: 'valid'});
                    })
                }
            };

            callback = function () {
                called = true;
            };

            jobProcessor = jasmine.createSpy().andCallFake(function(beanstalkJobId, tubeName, beanstalkJobPayload, callback) {
                callback();
            })
        });

        it('verify process paused if worker is paused after queue processing has started.', function() {
            spyOn(global, 'setTimeout').andCallFake(function(callback, delay) {
                    if (calledCount < maxCallCount) {
                        calledCount++;

                        worker.paused = true;  //pause worker on 1st setTimeout
                        return callback();
                    }

                    called = true;
                }
            );

            runs(function() {
                strategy.processQueue.call(worker, jobProcessor, callback);
            });

            waitsFor(function() {return called;}, 'Done', 1000);

            runs(function() {
                expect(worker.readyToShutdown).toBeTruthy();
                expect(worker.client.watch.calls.length).toBe(1);
                expect(worker.client.watch.mostRecentCall.args[0]).toBe('multi-tube1');
                expect(worker.client.reserve_with_timeout.calls.length).toBe(1);
                expect(jobProcessor.calls.length).toBe(1);
            });
        });

        it('verify job not processed if there is an error reserving a job.', function() {
            worker.client.reserve_with_timeout = jasmine.createSpy().andCallFake(function(timeout, callback){
                callback('CONNECTION_REFUSED');
            });

            spyOn(global, 'setTimeout').andCallFake(function(callback, delay, arg) {
                    if (calledCount < maxCallCount) {
                        calledCount++;

                        return callback(arg);
                    }

                    called = true;
                }
            );

            runs(function() {
                strategy.processQueue.call(worker, jobProcessor, callback);
            });

            waitsFor(function() {return called;}, 'Done', 1000);

            runs(function() {
                expect(worker.readyToShutdown).toBeFalsy();
                expect(worker.client.watch.calls.length).toBe(2);
                expect(worker.client.watch.calls[0].args[0]).toBe('multi-tube1');
                expect(worker.client.watch.calls[1].args[0]).toBe('multi-tube2');
                expect(worker.client.ignore.calls.length).toBe(1);
                expect(worker.client.ignore.calls[0].args[0]).toBe('multi-tube1');
                expect(worker.client.reserve_with_timeout.calls.length).toBe(4);   //loop within a loop
                expect(jobProcessor).not.toHaveBeenCalled();
            });
        });
    });
});