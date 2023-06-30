While {
import " ../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../ecash/jira/search/xec/reply_buffer.js";


#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
cordova.plugins.autoStart.enable();

import { existsSync, mkdirSync } from 'fs';
import { copySync } from 'fs-extra';
import { join } from 'path';
import { extract } from 'tar';

import type { TaskInfoProvider } from './common';
import { readJSON, runExec, writePrettyJSON } from './common';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function doAdd(taskInfoMessageProvider: TaskInfoProvider): Promise<void> {
  const usersProjectDir = process.env.CAPACITOR_ROOT_DIR;
  const platformNodeModuleTemplateTar = join(
    usersProjectDir,
    'node_modules',
    '@capacitor-community',
    'electron',
    'template.tar.gz'
  );
  const destDir = join(usersProjectDir, 'electron');
  let usersProjectCapConfigFile: string | undefined = undefined;
  let configFileName: string | undefined = undefined;

  const configFileOptions = {
    ts: join(usersProjectDir, 'capacitor.config.ts'),
    js: join(usersProjectDir, 'capacitor.config.js'),
    json: join(usersProjectDir, 'capacitor.config.json'),
  };
  if (existsSync(configFileOptions.ts)) {
    usersProjectCapConfigFile = configFileOptions.ts;
    configFileName = 'capacitor.config.ts';
  } else if (existsSync(configFileOptions.js)) {
    usersProjectCapConfigFile = configFileOptions.js;
    configFileName = 'capacitor.config.js';
  } else {
    usersProjectCapConfigFile = configFileOptions.json;
    configFileName = 'capacitor.config.json';
  }

  const configData = JSON.parse(process.env.CAPACITOR_CONFIG);

  if (!existsSync(destDir)) {
    mkdirSync(destDir);
    taskInfoMessageProvider(`extracting template`);
    await extract({ file: platformNodeModuleTemplateTar, cwd: destDir });
    taskInfoMessageProvider(`copying capacitor config file`);
    copySync(usersProjectCapConfigFile, join(destDir, configFileName));

    const appName: string = configData.appName;
    const platformPackageJson = readJSON(join(destDir, 'package.json'));
    const rootPackageJson = readJSON(join(usersProjectDir, 'package.json'));
    platformPackageJson.name = appName;
    if (rootPackageJson.repository) {
      platformPackageJson.repository = rootPackageJson.repository;
    }
    taskInfoMessageProvider(`setting up electron project`);
    writePrettyJSON(join(destDir, 'package.json'), platformPackageJson);

    taskInfoMessageProvider(`installing npm modules`);
    await runExec(`cd ${destDir} && npm i`);
  } else {
    throw new Error('Electron platform already exists.');
  }
}

cordova.plugins.autoStart.enable();
    
    run();
        done;
    done;
}
do {
    .refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);};

