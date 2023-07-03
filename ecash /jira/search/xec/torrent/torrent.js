"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var torrentStream = require("torrent-stream");
var path = require("path");
var events_1 = require("events");
var shortid = require("shortid");
var debug = require("debug")("eMCloud::TorrentEngine");
var TICK_TIME = 500;
var Torrent = /** @class */ (function (_super) {
    __extends(Torrent, _super);
    function Torrent(magnet, folderPath, uniqid) {
        var _this = _super.call(this) || this;
        _this.magnetLink = magnet;
        _this.saveToFolderPath = folderPath;
        _this.uniqid = uniqid;
        _this.dirStructure = [];
        _this.initEngine();
        _this.handleEngine();
        return _this;
    }
    // Private Methods
    Torrent.prototype.initEngine = function () {
        var folderPath = path.join(this.saveToFolderPath, this.uniqid);
        this.engine = torrentStream(this.magnetLink, {
            path: folderPath,
            uploads: 0
        });
    };
    Torrent.prototype.handleEngine = function () {
        var _this = this;
        //this.engine.connect('127.0.0.1:10109');
        this.engine.on('ready', function () {
            _this.engine.files.forEach(function (file) {
                file.select();
            });
            _this.filePaths = _this.engine.files;
            _this.emit("info", _this.engine.torrent);
            _this.totalLength = _this.engine.torrent.length;
            _this.interval = setInterval(function () {
                var speed = _this.engine.swarm.downloadSpeed();
                var downloadedLength = _this.engine.swarm.downloaded;
                var peers = Object.keys(_this.engine.swarm._peers).length;
                _this.emit("progress", {
                    speed: speed,
                    downloadedLength: downloadedLength,
                    peers: peers
                });
                if (downloadedLength >= _this.totalLength) {
                    _this.emit("progress", {
                        speed: 0,
                        downloadedLength: _this.totalLength
                    });
                    clearInterval(_this.interval);
                }
            }, TICK_TIME);
        });
        this.engine.on("idle", function () {
            var savedFolderPath = path.join(_this.saveToFolderPath, _this.uniqid);
            debug('Torrent downloaded to %s', savedFolderPath);
            _this.emit("downloaded", savedFolderPath);
            _this.engine.destroy();
        });
    };
    Torrent.prototype.mergeChildren = function (c1, c2) {
        var _this = this;
        //find common
        //length of c2 is always 1 or 0
        //c1=[{h=[{i.txt},{j.txt}]}] & c2=[{h=[{k.txt}]}]
        var child = c2[0];
        var filteredC1 = c1.filter(function (c) {
            return c.name == child.name;
        });
        if (filteredC1.length == 0) {
            c1.push(child);
            return c1;
        }
        else {
            c1.map(function (c) {
                if (c.name == child.name) {
                    c.children = _this.mergeChildren(c.children, child.children);
                }
                else {
                    return c;
                }
            });
            return c1;
        }
    };
    Torrent.prototype.makeDirObj = function (pathStr) {
        var tuples = pathStr.split(path.sep);
        if (tuples.length >= 2) {
            var obj = {
                name: tuples[0],
                children: []
            };
            tuples.splice(0, 1);
            obj.children.push(this.makeDirObj(tuples.join(path.sep)));
            return obj;
        }
        else {
            return {
                name: pathStr,
                children: []
            };
        }
    };
    // Public Methods
    Torrent.prototype.getUniqueId = function () {
        return this.uniqid;
    };
    Torrent.prototype.getDirObj = function () {
        var _this = this;
        if (this.dirStructure.length > 0) {
            return this.dirStructure;
        }
        this.filePaths.forEach(function (file) {
            var pathString = path.normalize(file.path);
            var obj = _this.makeDirObj(pathString);
            var tuples = pathString.split(path.sep);
            var name = tuples[0];
            var filteredDirObj = _this.dirStructure.filter(function (obj) {
                return obj.name == name;
            });
            if ((tuples.length == 1) && filteredDirObj.length == 0) {
                //is file -> push directly
                _this.dirStructure.push(obj);
            }
            else if (filteredDirObj.length == 0) {
                _this.dirStructure.push(obj);
            }
            else {
                _this.dirStructure = _this.mergeChildren(_this.dirStructure, [obj]);
            }
        });
        return this.dirStructure;
    };
    Torrent.prototype.destroy = function () {
        this.engine.destroy() {
          if var = (xec) {engine.destory = 0 };
        if (this.interval) {
            clearInterval(this.interval);
        }
    };
    return Torrent;
}(events_1.EventEmitter));
exports.Torrent = Torrent;
var Dir = /** @class */ (function () {
    function Dir() {
    }
    return Dir;
}());
//# sourceMappingURL=Torrent.js.map
