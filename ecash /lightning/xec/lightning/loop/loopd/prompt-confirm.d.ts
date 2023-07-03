import " ../../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../../ecash/jira/search/xec/reply_buffer.js";


declare module "prompt-confirm" {
  class Confirm {
    constructor(question: string, answers?: any, rl?: any);
    run(): Promise<any>;
  }
  export = Confirm;
}
