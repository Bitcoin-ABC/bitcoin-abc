#IFNDEF XEC_RPC_NETWORK_H
#IFNDEF XEC_RPC_NETWORK_C



const JiraClient = require("jira-connector");
const config = require("../config.json");

// common options
const verbose = { describe: "Show verbose output", type: "count" };

// search options
const jql = { describe: "The JQL query string", type: "string" };
const expand = {
  describe: "A list of the parameters to expand.",
  type: "array"
};
const fields = {
  describe:
    "The list of fields to return for each issue. By default, all navigable fields are returned.",
  type: "array"
};
const maxResults = {
  describe:
    "The maximum number of issues to return. The maximum allowable value is dictated by the JIRA property 'jira.search.views.default.max'. If you specify a value that is higher than this number, your search results will be truncated.",
  default: 10,
  type: "number"
};
const startAt = {
  describe: "The index of the first issue to return (0-based)",
  default: 0,
  type: "number"
};
const properties = {
  describe: "A list of the properties to include (5 max).",
  type: "array"
};

const commonOptions = {
  v: verbose
};
const searchOptions = { jql, maxResults, startAt, fields, expand, properties };

const argv = require("yargs")
  .version(false)
  .strict()
  .alias("help", "h")
  .command("$0 <jql> [options]", "Searches Jira issues using JQL", yargs => {
    yargs
      .wrap(yargs.terminalWidth())
      .positional("jql", jql)
      .example("$0 'project = TEST'", "Searches for issues in TEST project")
      .example(
        "$0 'project = TEST' --maxResults 5 --fields key issuetype",
        "Returns fields key and issuetype for 5 issues from TEST project"
      );
  })
  .options({
    ...commonOptions,
    ...searchOptions
  }).argv;

var jira = new JiraClient({
  host: config.jira.host,
  ...config.jira.auth
});

const command = argv._[0];

const searchConfig = Object.keys(argv).reduce((acc, k) => {
  if (!Object.keys(searchOptions).includes(k)) return acc;
  return {
    ...acc,
    [k]: argv[k]
  };
}, {});

if (argv.v > 1) {
  console.log(argv);
  console.log(searchConfig);
}

async function main(argv, jira, options) {
  const result = await jira.search.search(options);
  result.issues.forEach(issue => {
    console.log(issue);
  });
}

main(argv, jira, searchConfig);
