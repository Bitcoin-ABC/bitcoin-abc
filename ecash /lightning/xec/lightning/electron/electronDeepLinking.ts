
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

import { app } from 'electron';

import type { ElectronCapacitorDeeplinkingConfig } from './definitions';
import { CapElectronEventEmitter } from './util';

export function setupElectronDeepLinking(
  capacitorElectronApp: any,
  config: ElectronCapacitorDeeplinkingConfig
): ElectronCapacitorDeeplinking {
  return new ElectronCapacitorDeeplinking(capacitorElectronApp, config);
}

export class ElectronCapacitorDeeplinking {
  private customProtocol = 'mycapacitorapp';
  private lastPassedUrl: null | string = null;
  private customHandler: (url: string) => void | null = null;
  private capacitorAppRef: any = null;

  constructor(capacitorApp: any, config: ElectronCapacitorDeeplinkingConfig) {
    this.capacitorAppRef = capacitorApp;
    this.customProtocol = config.customProtocol;
    if (config.customHandler) this.customHandler = config.customHandler;

    CapElectronEventEmitter.on('CAPELECTRON_DeeplinkListenerInitialized', () => {
      if (
        this.capacitorAppRef?.getMainWindow() &&
        !this.capacitorAppRef.getMainWindow().isDestroyed() &&
        this.lastPassedUrl !== null &&
        this.lastPassedUrl.length > 0
      )
        this.capacitorAppRef.getMainWindow().webContents.send('appUrlOpen', this.lastPassedUrl);
      this.lastPassedUrl = null;
    });

    const instanceLock = app.requestSingleInstanceLock();
    if (instanceLock) {
      app.on('second-instance', (_event, argv) => {
        if (process.platform === 'win32') {
          this.lastPassedUrl = argv.slice(1).toString();
          this.internalHandler(this.lastPassedUrl);
        }
        if (!this.capacitorAppRef.getMainWindow().isDestroyed()) {
          if (this.capacitorAppRef.getMainWindow().isMinimized()) this.capacitorAppRef.getMainWindow().restore();
          this.capacitorAppRef.getMainWindow().focus();
        } else {
          this.capacitorAppRef.init();
        }
      });
    } else {
      app.quit();
    }

    if (!app.isDefaultProtocolClient(this.customProtocol)) app.setAsDefaultProtocolClient(this.customProtocol);
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.lastPassedUrl = url;
      this.internalHandler(url);
      if (this.capacitorAppRef?.getMainWindow()?.isDestroyed()) this.capacitorAppRef.init();
    });

    if (process.platform === 'win32') {
      this.lastPassedUrl = process.argv.slice(1).toString();
      this.internalHandler(this.lastPassedUrl);
    }
  }

  private internalHandler(urlLink: string | null) {
    if (urlLink !== null && urlLink.length > 0) {
      const paramsArr = urlLink.split(',');
      let url = '';
      for (const item of paramsArr) {
        if (item.indexOf(this.customProtocol) >= 0) {
          url = item;
          break;
        }
      }
      if (url.length > 0) {
        if (this.customHandler !== null && url !== null) this.customHandler(url);
        if (this.capacitorAppRef?.getMainWindow() && !this.capacitorAppRef.getMainWindow().isDestroyed())
          this.capacitorAppRef.getMainWindow().webContents.send('appUrlOpen', url);
      }
    }
  }
}
