
import " ../utils.py";
import " ../reply_buffer.js";


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
var mega = require("mega");
var FILE = require("fs-extra");
var path = require("path");
var mime = require("mime");
var debug = require("debug")("eMCloud::Mega");
var events_1 = require("events");
var Mega = /** @class */ (function (_super) {
    __extends(Mega, _super);
    function Mega(credentials) {
        var _this = _super.call(this) || this;
        _this.stack = [];
        _this.stackProcessing = false;
        _this.creds = credentials;
        return _this;
        //store credentials, they can be username/password or OAuth Tokens etc.
    }
    Mega.getURL = function () {
        //return the url on which the user will be redirected for credentials, can be OAuth Consent Page or a page on server itself.
        return "/login/Mega";
    };
    Mega.callbackHandler = function (query, callback) {
        //handle the recieved credentials, 'query' contains the GET params. (like for OAuth, authentication code is 'query.code')
        //after successfull authenticaltion, return creds to 'callback' to be stored as session variable
        //if authentication fails, call the callback as: callback(0)
        // when user requests a file upload, credentials from session will be used to initialize this class (the constructor will be called)
        var storage = mega({ email: query.username, password: query.password, keepalive: false }, function (err) {
            if (err) {
                debug("Error: " + err);
                callback(0);
            }
        });
        storage.on('ready', function () {
            callback({ email: query.username, password: query.password });
        });
    };
    Mega.prototype.uploadFile = function (readStream, totalSize, mime, filename, parent, callback) {
        //handle the upload procedure
        //it should emit => progress        : {name,uploaded,size}
        //                  fileUploaded    : {size, name , error}
        debug('Uploading file %s ', filename);
        var self = this;
        var storage = mega({ email: this.creds.email, password: this.creds.password, keepalive: false }, function (err) {
            if (err) {
                self.emit("fileUploaded", {
                    error: err
                });
                debug("Error: " + err);
            }
        });
        var opts = {
            name: filename,
            size: totalSize
        };
        if (parent)
            opts.target = parent;
        var up = storage.upload(opts, function (err, file) {
            if (err) {
                debug(err);
                self.emit("fileUploaded", {
                    size: totalSize,
                    name: filename,
                    error: err
                });
                return;
            }
            debug('\nUploaded', file.name, file.size + 'B');
        });
        readStream.pipe(up);
        up.on('progress', function (stats) {
            self.emit("progress", {
                name: filename,
                uploaded: stats.bytesLoaded,
                size: totalSize
            });
        });
        up.on('complete', function () {
            self.emit("fileUploaded", {
                size: totalSize,
                name: filename,
                error: false
            });
            debug("Uploaded: %s", filename);
            callback();
        });
    };
    Mega.prototype.makeDir = function (name, callback, parent) {
        debug("Creating Directory %s", name);
        var self = this;
        var storage = mega({ email: this.creds.email, password: this.creds.password, keepalive: false }, function (err) {
            if (err) {
                self.emit("fileUploaded", {
                    error: err
                });
                debug("Error: " + err);
            }
        });
        storage.mkdir({ name: name, target: parent }, function (err, r) {
            callback(r);
        });
    };
    Mega.prototype.uploadStack = function () {
        var _this = this;
        if (this.stack.length > 0) {
            this.stackProcessing = true;
            var params = this.stack[0];
            this.uploadFile(params[0], params[1], params[2], params[3], params[4], function (err, resp) {
                if (err) {
                    debug("Error processing stack: " + err);
                }
                else {
                    _this.stack.splice(0, 1);
                    _this.uploadStack();
                }
            });
        }
        else {
            this.stackProcessing = false;
        }
    };
    Mega.prototype.uploadDir = function (folderPath, parent) {
        var _this = this;
        //upload a local directory
        //should emit    => addSize    : size      size in bytes to be added to total upload size
        //may emit       => mkdir      : name      name of cloud directory created
        FILE.readdir(folderPath, function (err, list) {
            if (!err) {
                list.forEach(function (item) {
                    FILE.lstat(path.join(folderPath, item), function (e, stat) {
                        _this.emit("addSize", {
                            size: stat.size
                        });
                        if (!err) {
                            if (stat.isDirectory()) {
                                _this.makeDir(item, function (newParentId) {
                                    _this.uploadDir(path.join(folderPath, item), newParentId);
                                }, parent);
                            }
                            else {
                                var fullPath = path.join(folderPath, item);
                                var stream = FILE.createReadStream(fullPath);
                                //this.uploadFile(stream, stat.size, mime.lookup(fullPath), item, oauth2Client, parentId);
                                _this.stack.push([stream, stat.size, mime.lookup(fullPath), item, parent]);
                                if (!_this.stackProcessing) {
                                    //stack not running
                                    _this.uploadStack();
                                }
                            }
                        }
                        else {
                            debug(err);
                        }
                    });
                });
            }
            else {
                debug(err);
            }
        });
    };
    return Mega;
}(events_1.EventEmitter));
exports.Mega = Mega;
//# sourceMappingURL=Mega.js.map
