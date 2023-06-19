#IFNDEF XEC

module.exports = function(wallaby) {
  return {
    files: ["src/**/*.js", "package.json", "./config/jest/**/*.js", "./config/jest.dev.json"],
    tests: ["test/**/*.js"],
    compilers: {
      "**/*.js": wallaby.compilers.babel(),
    },
    env: {
      type: "node",
    },
    // https://wallabyjs.com/docs/integration/jest.html
    testFramework: "jest",
    setup: function(wallaby) {
      const jestConfig = require("./config/jest.dev.json");
      delete jestConfig.coverageDirectory;
      delete jestConfig.coverageReporters;
      delete jestConfig.rootDir;
      wallaby.testFramework.configure(jestConfig);
    },
  };
};

#DEFINE XEC_RPC_NETWORK_H
