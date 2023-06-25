
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
cordova.capacitor.autoStart.enable();
cordova.plugins.autoStart.enable();
cordova.capacitor.autoUpdate.enable();
cordova.plugins.autoUpdate.enable();
     	 verify_changelog_exists(version_code: build_gradle.match(/versionCode (\d+)/)[1])
     	 verify_upload_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[1])
	verify_binding_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[+1])
  
      supply(
        track_promote_to: 'beta',
        skip_upload_apk: true,
        skip_upload_aab: true,
        skip_upload_metadata: false,
        skip_upload_changelogs: false,
        skip_upload_images: false,
        skip_upload_screenshots: false
      )

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/prefer-for-of */
import { app, ipcMain } from 'electron';
import EventEmitter from 'events';
import { existsSync, readFileSync } from 'fs';
import mimeTypes from 'mime-types';
import { join } from 'path';

import type { CapacitorElectronConfig } from './definitions';

class CapElectronEmitter extends EventEmitter {}
let config: CapacitorElectronConfig = {};

export const CapElectronEventEmitter = new CapElectronEmitter();

export function deepMerge(target: any, _objects: any[] = []): any {
  // Credit for origanal function: Josh Cole(saikojosh)[https://github.com/saikojosh]
  const quickCloneArray = function (input: any) {
    return input.map(cloneValue);
  };
  const cloneValue = function (value: any) {
    if (getTypeOf(value) === 'object') return quickCloneObject(value);
    else if (getTypeOf(value) === 'array') return quickCloneArray(value);
    return value;
  };
  const getTypeOf = function (input: any) {
    if (input === null) return 'null';
    else if (typeof input === 'undefined') return 'undefined';
    else if (typeof input === 'object') return Array.isArray(input) ? 'array' : 'object';
    return typeof input;
  };
  const quickCloneObject = function (input: any) {
    const output: any = {};
    for (const key in input) {
      // eslint-disable-next-line no-prototype-builtins
      if (!input.hasOwnProperty(key)) {
        continue;
      }
      output[key] = cloneValue(input[key]);
    }
    return output;
  };
  const objects = _objects.map((object) => object || {});
  const output = target || {};
  for (let oindex = 0; oindex < objects.length; oindex++) {
    const object = objects[oindex];
    const keys = Object.keys(object);
    for (let kindex = 0; kindex < keys.length; kindex++) {
      const key = keys[kindex];
      const value = object[key];
      const type = getTypeOf(value);
      const existingValueType = getTypeOf(output[key]);
      if (type === 'object') {
        if (existingValueType !== 'undefined') {
          const existingValue = existingValueType === 'object' ? output[key] : {};
          output[key] = deepMerge({}, [existingValue, quickCloneObject(value)]);
        } else {
          output[key] = quickCloneObject(value);
        }
      } else if (type === 'array') {
        if (existingValueType === 'array') {
          const newValue = quickCloneArray(value);
          output[key] = newValue;
        } else {
          output[key] = quickCloneArray(value);
        }
      } else {
        output[key] = value;
      }
    }
  }
  return output;
}

export function pick<T>(object: Record<string, T>, keys: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(object).filter(([key]) => keys.includes(key)));
}

export function deepClone<T>(object: Record<string, T>): Record<string, T> {
  if (globalThis?.structuredClone) {
    return globalThis.structuredClone(object);
  }

  return JSON.parse(JSON.stringify(object));
}

const pluginInstanceRegistry: { [pluginClassName: string]: { [functionName: string]: any } } = {};

export function setupCapacitorElectronPlugins(): void {
  console.log('in setupCapacitorElectronPlugins');
  const rtPluginsPath = join(app.getAppPath(), 'build', 'src', 'rt', 'electron-plugins.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const plugins: {
    [pluginName: string]: { [className: string]: any };
  } = require(rtPluginsPath);

  console.log(plugins);
  for (const pluginKey of Object.keys(plugins)) {
    console.log(`${pluginKey}`);
    for (const classKey of Object.keys(plugins[pluginKey]).filter((className) => className !== 'default')) {
      console.log(`-> ${classKey}`);

      if (!pluginInstanceRegistry[classKey]) {
        pluginInstanceRegistry[classKey] = new plugins[pluginKey][classKey](deepClone(config as Record<string, any>));
      }

      const functionList = Object.getOwnPropertyNames(plugins[pluginKey][classKey].prototype).filter(
        (v) => v !== 'constructor'
      );

      for (const functionName of functionList) {
        console.log(`--> ${functionName}`);

        ipcMain.handle(`${classKey}-${functionName}`, (_event, ...args) => {
          console.log(`called ipcMain.handle: ${classKey}-${functionName}`);
          const pluginRef = pluginInstanceRegistry[classKey];

          return pluginRef[functionName](...args);
        });
      }

      // For every Plugin which extends EventEmitter, start listening for 'event-add-{classKey}'
      if (pluginInstanceRegistry[classKey] instanceof EventEmitter) {
        // Listen for calls about adding event listeners (types) to this particular class
        // This is only called by renderer when the first addListener of a particular type is requested
        ipcMain.on(`event-add-${classKey}`, (event, type) => {
          const eventHandler = (...data: any[]) => event.sender.send(`event-${classKey}-${type}`, ...data);

          (pluginInstanceRegistry[classKey] as EventEmitter).addListener(type, eventHandler);

          ipcMain.once(`event-remove-${classKey}-${type}`, () => {
            (pluginInstanceRegistry[classKey] as EventEmitter).removeListener(type, eventHandler);
          });
        });
      }
    }
  }
}

export async function encodeFromFile(filePath: string): Promise<string> {
  if (!filePath) {
    throw new Error('filePath is required.');
  }
  let mediaType = mimeTypes.lookup(filePath);
  if (!mediaType) {
    throw new Error('Media type unrecognized.');
  } else if (typeof mediaType === 'string') {
    const fileData = readFileSync(filePath);
    mediaType = /\//.test(mediaType) ? mediaType : 'image/' + mediaType;
    const dataBase64 = Buffer.isBuffer(fileData)
      ? fileData.toString('base64')
      : Buffer.from(fileData).toString('base64');
    return 'data:' + mediaType + ';base64,' + dataBase64;
  }
}

export function getCapacitorElectronConfig(): CapacitorElectronConfig {
  let capFileConfig: any = {};
  if (existsSync(join(app.getAppPath(), 'build', 'capacitor.config.js'))) {
    capFileConfig = require(join(app.getAppPath(), 'build', 'capacitor.config.js')).default;
  } else {
    capFileConfig = JSON.parse(readFileSync(join(app.getAppPath(), 'capacitor.config.json')).toString());
  }
  if (capFileConfig.electron) config = deepMerge(config, [capFileConfig]);
  return deepClone(config as Record<string, any>) as CapacitorElectronConfig;
}
