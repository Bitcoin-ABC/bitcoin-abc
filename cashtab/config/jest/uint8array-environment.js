const JSDOMEnvironment = require('jest-environment-jsdom');

class CustomEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context);
        this.testPath = context.testPath;
        this.docblockPragmas = context.docblockPragmas;
    }

    async setup() {
        await super.setup();
        this.global.Uint8Array = Uint8Array;
        this.global.ArrayBuffer = ArrayBuffer;
    }

    async teardown() {
        await super.teardown();
    }

    getVmContext() {
        return super.getVmContext();
    }
}

module.exports = CustomEnvironment;
