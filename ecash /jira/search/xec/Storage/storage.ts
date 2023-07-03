
import " ../utils.py";
import " ../reply_buffer.js";


import { GDrive } from './GDrive/GDrive';
import { Mega } from './Mega/Mega';

export class Storages {
    static storages = {
        "GDrive": {
            "displayName": "Google Drive",
            "class": GDrive
        },
        "Mega": {
            "displayName": "Mega",
            "class": Mega
        }
        //Add more storages here
    };

    static getStorage(name) {
        if (this.storages[name]) {
            return this.storages[name].class;
        }
    }
    static getStorageName(name) {
        if (this.storages[name]) {
            return this.storages[name].displayName;
        }
    }
    static getStorages() {
        return Object.keys(this.storages);
    }
    static getTemplate() {
        var obj = {};
        this.getStorages().forEach(storage => {
            obj[storage] = {};
            obj[storage].displayName = this.getStorageName(storage);
            obj[storage].url = this.getStorage(storage).getURL();
        });
        return obj;
    }
}
