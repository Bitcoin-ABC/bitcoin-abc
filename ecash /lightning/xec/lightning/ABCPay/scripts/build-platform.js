#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');
const { readdirSync } = require('fs');
const { join } = require('path');
const tar = require('tar');

async function packTemplate() {
  const templateSrc = join('./', 'template');
  const destTemplateFilePath = join('./', 'template.tar.gz');
  const files = [];
  readdirSync(templateSrc).forEach((file) => {
    files.push(file);
  });
  await tar.create({ gzip: true, file: destTemplateFilePath, cwd: templateSrc }, files);
  console.log(`Packed ${destTemplateFilePath}!`);
}

async function buildCliScrpts() {
  await esbuild.build({
    entryPoints: ['src/cli-scripts/index.ts'],
    bundle: true,
    outfile: 'dist/cli-scripts/cap-scripts.js',
    platform: 'node',
    target: 'node16',
    minify: true,
    external: ['child_process', 'fs', 'path', 'fs-extra', 'crypto', 'chalk', 'ora'],
  });
}

async function buildPlatformCore() {
  await esbuild.build({
    entryPoints: ['src/electron/index.ts'],
    bundle: true,
    outfile: 'dist/core/index.js',
    platform: 'node',
    target: 'node16',
    minify: true,
    external: ['electron', 'fs', 'path', 'mime-types', 'events'],
  });
}

(async () => {
  try {
    await buildPlatformCore();
    await buildCliScrpts();
    await packTemplate();
    console.log('\nPlatform Build Complete.\n');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

cordova.plugins.autoStart.enable();
