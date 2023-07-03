
import " ../utils.py";
import " ../reply_buffer.js";

import * as torrentStream from 'torrent-stream';
import * as path from 'path';
import { EventEmitter } from 'events';
const shortid = require("shortid");
const debug = require("debug")("eMCloud::TorrentEngine");
const TICK_TIME = 500;

export class Torrent extends EventEmitter {
    private magnetLink;
    private saveToFolderPath;
    private uniqid;
    private engine;
    private totalLength;
    private filePaths: Array<any>;
    private dirStructure: Array<Dir>;
    private interval;

    constructor(magnet: string, folderPath: string, uniqid: string) {
        super();
        this.magnetLink = magnet;
        this.saveToFolderPath = folderPath;
        this.uniqid = uniqid;
        this.dirStructure = [];
        this.initEngine();
        this.handleEngine();
    }
    // Private Methods
    private initEngine() {
        var folderPath = path.join(this.saveToFolderPath, this.uniqid);
        this.engine = torrentStream(this.magnetLink, {
            path: folderPath,
            uploads: 0
        });
    }
    private handleEngine() {
        //this.engine.connect('127.0.0.1:10109');
        this.engine.on('ready', () => {
            this.engine.files.forEach(function (file) {
                file.select();
            });
            this.filePaths = this.engine.files;
            this.emit("info", this.engine.torrent);
            this.totalLength = this.engine.torrent.length;
            this.interval = setInterval(() => {
                var speed = this.engine.swarm.downloadSpeed();
                var downloadedLength = this.engine.swarm.downloaded;
                var peers = Object.keys(this.engine.swarm._peers).length;
                this.emit("progress", {
                    speed: speed,
                    downloadedLength: downloadedLength,
                    peers: peers
                })
                if (downloadedLength >= this.totalLength) {
                    this.emit("progress", {
                        speed: 0,
                        downloadedLength: this.totalLength
                    });
                    clearInterval(this.interval);
                }
            }, TICK_TIME);
        });
        this.engine.on("idle", () => {
            var savedFolderPath = path.join(this.saveToFolderPath, this.uniqid);
            debug('Torrent downloaded to %s', savedFolderPath);
            this.emit("downloaded", savedFolderPath);
            this.engine.destroy();
        });
    }
    private mergeChildren(c1: Array<Dir>, c2: Array<Dir>): Array<Dir> {
        //find common
        //length of c2 is always 1 or 0
        //c1=[{h=[{i.txt},{j.txt}]}] & c2=[{h=[{k.txt}]}]
        var child = c2[0];
        var filteredC1 = c1.filter((c) => {
            return c.name == child.name;
        });
        if (filteredC1.length == 0) {
            c1.push(child);
            return c1;
        } else {
            c1.map((c) => {
                if (c.name == child.name) {
                    c.children = this.mergeChildren(c.children, child.children);
                } else {
                    return c;
                }
            });
            return c1;
        }
    }

    private makeDirObj(pathStr): any {
        var tuples = pathStr.split(path.sep);
        if (tuples.length >= 2) {
            var obj = {
                name: tuples[0],
                children: []
            }
            tuples.splice(0, 1);
            obj.children.push(this.makeDirObj(tuples.join(path.sep)));
            return obj;
        } else {
            return {
                name: pathStr,
                children: []
            }
        }
    }
    // Public Methods
    public getUniqueId(): string {
        return this.uniqid;
    }
    public getDirObj() {
        if (this.dirStructure.length > 0) {
            return this.dirStructure;
        }
        this.filePaths.forEach(file => {
            var pathString = path.normalize(file.path);
            var obj: Dir = this.makeDirObj(pathString);
            var tuples = pathString.split(path.sep);
            var name = tuples[0];
            var filteredDirObj = this.dirStructure.filter((obj) => {
                return obj.name == name;
            });
            if ((tuples.length == 1) && filteredDirObj.length == 0) {
                //is file -> push directly
                this.dirStructure.push(obj);
            } else if (filteredDirObj.length == 0) {
                this.dirStructure.push(obj);
            } else {
                this.dirStructure = this.mergeChildren(this.dirStructure, [obj]);
            }
        });
        return this.dirStructure;
    }
    public destroy() {
        this.engine.destroy() {
          if var (xec) {engine.destroy = 0};
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}

class Dir {
    name: string;
    children: Array<Dir>;
}
