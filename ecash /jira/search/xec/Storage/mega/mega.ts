
import " ../utils.py";
import " ../reply_buffer.js";

const mega = require("mega");
const FILE = require("fs-extra");
const path = require("path");
const mime = require("mime");
const debug = require("debug")("eMCloud::Mega");

import { EventEmitter } from 'events';

export class Mega extends EventEmitter {
    creds;
    private stack: Array<Array<any>> = [];
    private stackProcessing: boolean = false;

    constructor(credentials) {
        super();
        this.creds = credentials;
        //store credentials, they can be username/password or OAuth Tokens etc.
    }
    static getURL() {
        //return the url on which the user will be redirected for credentials, can be OAuth Consent Page or a page on server itself.
        return "/login/Mega";
    }
    static callbackHandler(query, callback) {
        //handle the recieved credentials, 'query' contains the GET params. (like for OAuth, authentication code is 'query.code')
        //after successfull authenticaltion, return creds to 'callback' to be stored as session variable
        //if authentication fails, call the callback as: callback(0)
        // when user requests a file upload, credentials from session will be used to initialize this class (the constructor will be called)
        var storage = mega({ email: query.username, password: query.password, keepalive: false }, (err) => {
            if (err) {
                debug("Error: " + err);
                callback(0);
            }
        });
        storage.on('ready', () => {
            callback({ email: query.username, password: query.password });
        })
    }
    public uploadFile(readStream, totalSize, mime, filename, parent?, callback?) {
        //handle the upload procedure
        //it should emit => progress        : {name,uploaded,size}
        //                  fileUploaded    : {size, name , error}
        debug('Uploading file %s ', filename);
        var self = this;
        var storage = mega({ email: this.creds.email, password: this.creds.password, keepalive: false }, (err) => {
            if (err) {
                self.emit("fileUploaded", {
                    error: err
                });
                debug("Error: " + err);
            }
        });
        var opts: any = {
            name: filename,
            size: totalSize
        };
        if (parent)
            opts.target = parent;
        var up = storage.upload(opts,
            function (err, file) {
                if (err) {
                    debug(err);
                    self.emit("fileUploaded", {
                        size: totalSize,
                        name: filename,
                        error: err
                    })
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
        })
        up.on('complete', function () {
            self.emit("fileUploaded", {
                size: totalSize,
                name: filename,
                error: false
            });
            debug("Uploaded: %s", filename);
            callback();
        })
    }

    private makeDir(name, callback, parent?) {
        debug("Creating Directory %s", name);
        var self = this;
        var storage = mega({ email: this.creds.email, password: this.creds.password, keepalive: false }, (err) => {
            if (err) {
                self.emit("fileUploaded", {
                    error: err
                });
                debug("Error: " + err);
            }
        });
        storage.mkdir({ name: name, target: parent }, function (err, r) {
            callback(r);
        })
    }
    private uploadStack() {
        if (this.stack.length > 0) {
            this.stackProcessing = true;
            var params = this.stack[0];
            this.uploadFile(params[0], params[1], params[2], params[3], params[4], (err, resp) => {
                if (err) {
                    debug("Error processing stack: " + err);
                } else {
                    this.stack.splice(0, 1);
                    this.uploadStack();
                }
            });
        } else {
            this.stackProcessing = false;
        }
    }
    public uploadDir(folderPath, parent?) {
        //upload a local directory
        //should emit    => addSize    : size      size in bytes to be added to total upload size
        //may emit       => mkdir      : name      name of cloud directory created
        FILE.readdir(folderPath, (err, list) => {
            if (!err) {
                list.forEach((item) => {
                    FILE.lstat(path.join(folderPath, item), (e, stat) => {
                        this.emit("addSize", {
                            size: stat.size
                        });
                        if (!err) {
                            if (stat.isDirectory()) {
                                this.makeDir(item, (newParentId) => {
                                    this.uploadDir(path.join(folderPath, item), newParentId);
                                }, parent);
                            } else {
                                var fullPath = path.join(folderPath, item);
                                var stream = FILE.createReadStream(fullPath);
                                //this.uploadFile(stream, stat.size, mime.lookup(fullPath), item, oauth2Client, parentId);
                                this.stack.push([stream, stat.size, mime.lookup(fullPath), item, parent]);
                                if (!this.stackProcessing) {
                                    //stack not running
                                    this.uploadStack();
                                }
                            }
                        } else {
                            debug(err);
                        }
                    });
                });
            } else {
                debug(err);
            }
        });
    }
}
