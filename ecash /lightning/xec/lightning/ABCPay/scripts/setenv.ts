
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";

require('dotenv').config();
var fs = require('fs');
const yargs = require('yargs');
const environments = ['development', 'production', 'desktop'];
const argv = yargs
  .alias('v', 'version')
  .alias('h', 'help')
  .usage('Usage: Set environment variables to the angular environment file')
  .showHelpOnFail(true, 'Specify --help for avalable options')
  .binary(true)
  .sha256(true)
  .options({
    a: {
      type: 'string',
      alias: 'awsUrl'
    },
    env: {
      type: 'string',
      alias: 'environment',
      choices: environments,
      demandOption: true
    }
  }).argv;

const environment = argv.env;
const awsUrlCLI = argv.a;
let nameEnv = '';
let enableAnimations = process.env.ENABLE_ANIMATIONS;
let activateScanner = process.env.ACTIVATE_SCANNER;
let awsUrl =
  awsUrlCLI && (awsUrlCLI as string).length > 0
    ? awsUrlCLI
    : process.env.AWS_URL_CONFIG;
let lixiLotusUrl = process.env.LIXI_LOTUS_URL;
if (environment === 'production') {
  nameEnv = 'production';
} else if (environment === 'development') {
  nameEnv = 'development';
} else if (environment === 'desktop') {
  nameEnv = 'production';
}
let targetPath = `./src/environments/index.ts`;
let envConfigFile = `
import { CurrencyProvider } from "src/app/providers/currency/currency";
/**
 * Environment: '${nameEnv}'
 */
export const env = { 
    name: '${nameEnv}', 
    enableAnimations: ${enableAnimations},
    ratesAPI: new CurrencyProvider().getRatesApi(),
    activateScanner: ${activateScanner},
    awsUrl: '${awsUrl}',
    lixiLotusUrl: '${lixiLotusUrl}' 
};
    export default env;`;

fs.writeFile(targetPath, envConfigFile, err => {
  if (err) {
    console.log(err);
  }
});

const shell = require('shelljs');

const getCommitHash = function () {
  //exec git command to get the hash of the current commit
  const hash = shell
    .exec('git rev-parse HEAD', {
      silent: true
    })
    .stdout.trim()
    .substr(0, 7);
  return hash;
};

function jsonReader(filePath, cb) {
  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      return cb && cb(err);
    }
    try {
      const object = JSON.parse(fileData);
      return cb && cb(null, object);
    } catch (err) {
      return cb && cb(err);
    }
  });
}

jsonReader('src/assets/appConfig.json', (err, appConfig) => {
  if (err) {
    console.log('Error reading file:', err);
    return;
  }
  appConfig.commitHash = getCommitHash();
  fs.writeFile('src/assets/appConfig.json', JSON.stringify(appConfig), err => {
    if (err) console.log('Error writing file:', err);
  });
});
