const util = require('util');

jasmine.getEnv().addReporter({
    specStarted: result => (jasmine.currentTest = result),
    specDone: result => (jasmine.currentTest = result),
});

let consoleMessageBackup = [];

function moveConsoleMessagesToBackup(text, logger) {
    try {
        throw new Error('Getting Stack Trace from previous Error');
    } catch (err) {
        let trace = err.stack.split('\n');
        trace.shift(); // removes Error: stacktrace
        trace.shift(); // removes  moveConsoleMessagesToBackup() call from the "throw" command
        trace.shift(); // removes console logger call in the console override
        consoleMessageBackup.push({
            logger: logger,
            payload: text,
            stacktrace: trace.join('\n'),
        });
    }
}

const orig = console;
global.console = {
    ...console,
    log: text => moveConsoleMessagesToBackup(text, orig.log),
    error: text => moveConsoleMessagesToBackup(text, orig.error),
    warn: text => moveConsoleMessagesToBackup(text, orig.warn),
    info: text => moveConsoleMessagesToBackup(text, orig.info),
    debug: text => moveConsoleMessagesToBackup(text, orig.debug),
};

global.afterEach(() => {
    let isFailedTest = true;
    if (
        jasmine &&
        jasmine.currentTest &&
        Array.isArray(jasmine.currentTest.failedExpectations)
    ) {
        isFailedTest = jasmine.currentTest.failedExpectations.length > 0;
    }

    if (isFailedTest) {
        consoleMessageBackup.forEach(msg => {
            if (
                typeof msg.payload === 'object' ||
                typeof msg.payload === 'function'
            ) {
                msg.payload = util.inspect(msg.payload, false, null, true);
            }
            msg.logger.call(msg.logger, msg.payload + '\n' + msg.stacktrace);
        });
    }
    consoleMessageBackup = [];
});
