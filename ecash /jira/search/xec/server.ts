
import " ../utils.py";
import " ../reply_buffer.js";

declare function require(name);
declare var process;
declare var __dirname;
//region requires
const unblocker = require('./unblocker.js');
const shortid = require('shortid');
const session = require('express-session');
const prettyBytes = require('pretty-bytes');
const debug = require('debug')("eMCloud::Server");
const socketIO = require("socket.io");
const FILE = require("fs-extra");
const archiver = require("archiver");
const magnet = require('magnet-uri');
const scrapeIt = require("scrape-it");
const http = require("http");
const path = require("path");
const magnetLink = require("magnet-link");

import * as mime from 'mime';
import { Storages } from './Storages/Storages';
import { Torrent } from './Torrent/Torrent';
import { Filter } from './Filter/Filter';
import * as express from 'express';
import * as url from 'url';
//endregion
//region Constants
const PORT = Number(process.env.PORT || 3000);
const FILES_PATH = path.join(__dirname, '../files');
const SPEED_TICK_TIME = 750;    //ms
const TBP_PROXY = process.env["TBP_PROXY"] || "https://thepiratebay.org";
//endregion
//region Init
var capture = false;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var visitedPages = {};
var torrents = {};
var torrentObjs = {};
const filter = new Filter();
//endregion
//region Utilities
function percentage(n): any {
    var p = (Math.round(n * 1000) / 10);
    return (p > 100) ? 100 : p;
}
//endregion
//region session handlers
function saveToDriveHandler(session, data) {
    var obj = data.data;
    var sessionID = session.id;
    if (obj.progress !== 100) {
        var i = visitedPages[obj.id].uploadTo.indexOf(session);
        if (i > -1) {
            //already in Array
            visitedPages[obj.id].uploadTo.splice(i, 1);
            visitedPages[obj.id].msg = "Auto-Upload Disabled";
        } else {
            //new subscriber
            visitedPages[obj.id].uploadTo.push(session);
            visitedPages[obj.id].msg = "Auto-Upload Enabled";
        }
        visitedPages[obj.id].uploadFileName = data.name;
        sendVisitedPagesUpdate(io, obj.id);
        return;
    }
    var stream = FILE.createReadStream(path.join(FILES_PATH, '../', obj.path));
    var cloud = Storages.getStorage(session.selectedCloud);
    var cloudInstance = new cloud(session.clouds[session.selectedCloud].creds);
    if (!cloudInstance.uploadFile) {
        visitedPages[obj.id].msg = "Feature Unavailable";
        sendVisitedPagesUpdate(io, obj.id);
        return;
    }
    var req = cloudInstance.uploadFile(stream, obj.length, obj.mime, data.name, false);
    cloudInstance.on('progress', (data) => {
        if (visitedPages[obj.id]) {     //check if user deleted the file 
            visitedPages[obj.id].msg = "Uploaded " + percentage(data.uploaded / obj.length) + "%";
            sendVisitedPagesUpdate(io, obj.id);
        }
    });
    cloudInstance.on("fileUploaded", (data) => {
        if (!visitedPages[obj.id]) { return; }
        if (data.error) {
            console.log(data.error);
            var msg = "Error: " + data.error;
            visitedPages[obj.id].msg = msg;
            sendVisitedPagesUpdate(io, obj.id);
        } else {
            var msg = "Uploaded " + data.name + " to Drive";
            visitedPages[obj.id].msg = msg;
            sendVisitedPagesUpdate(io, obj.id);
        }
    });
}
/**
 *@params:  sessionID
            data        {data:id}
 */
function uploadDirToDrive(session, data) {
    var id = data.id;
    var sessionID = session.id;
    if (torrents[id].progress !== 100) {
        var i = torrents[id].uploadTo.indexOf(session);
        if (i > -1) {
            //already in Array
            torrents[id].uploadTo.splice(i, 1);
            torrents[id].msg = "Auto-Upload Disabled";
        } else {
            //new subscriber
            torrents[id].uploadTo.push(session);
            torrents[id].msg = "Auto-Upload Enabled";
        }
        sendTorrentsUpdate(io, id);
        return;
    }
    var dirSize = 0;
    var currentFileProgress = 0;
    var cloud = Storages.getStorage(session.selectedCloud);
    var cloudInstance = new cloud(session.clouds[session.selectedCloud].creds);
    if (!cloudInstance.uploadDir) {
        torrents[id].msg = "Feature Unavailable";
        sendTorrentsUpdate(io, id);
        return;
    }
    cloudInstance.uploadDir(path.join(FILES_PATH, id), false);
    var uploaded = 0;
    cloudInstance.on("addSize", (data) => {
        dirSize = dirSize + data.size;
    });
    cloudInstance.on("fileUploaded", (data) => {
        if (!torrents[id]) { return; }
        uploaded += data.size;
        var name = data.name;
        torrents[id].msg = "Uploaded " + name + " successfully | Total: " + percentage(uploaded / dirSize) + "%";
        torrents[id].cloudUploadProgress = percentage(uploaded / dirSize);
        sendTorrentsUpdate(io, id);
    });
    cloudInstance.on('progress', (data) => {
        if (!torrents[id]) { return; }
        currentFileProgress = data.uploaded;
        var totalProgress = percentage((uploaded + currentFileProgress) / dirSize);
        torrents[id].msg = 'Uploading ' + data.name + ' : ' + percentage(data.uploaded / data.size) + "% | Total: " + totalProgress + "%";
        torrents[id].cloudUploadProgress = totalProgress;
        sendTorrentsUpdate(io, id);
    });
    cloudInstance.on("mkdir", (data) => {
        if (!torrents[id]) { return; }
        torrents[id].msg = 'Creating cloud directory: ' + data.name;
        sendTorrentsUpdate(io, id);
    });
}

function clearVisitedPage(id) {
    if (!visitedPages[id].pinned) {
        io.emit("deleteKey", {
            name: 'visitedPages',
            key: id
        });
        if (visitedPages[id].progress == 100) {
            //  download completed but user requested to clear
            // delete downloaded file
            FILE.unlink(path.join(FILES_PATH, '../', visitedPages[id].path));
            delete visitedPages[id];
        } else {
            // download is in progress
            // partial file will be deleted by middleware function
            visitedPages[id].cleared = true;
        }
    }
}

function clearTorrent(id) {
    if (!torrents[id].pinned) {
        io.emit("deleteKey", {
            name: 'torrents',
            key: id
        });
        if (torrents[id].progress == 100) {
            //  download completed but user requested to clear
            // delete downloaded file
            FILE.remove(path.join(FILES_PATH, id));
            FILE.remove(path.join(FILES_PATH, id + ".zip"));
            delete torrents[id];
            delete torrentObjs[id];
        } else {
            delete torrents[id];
            torrentObjs[id].destroy();
            delete torrentObjs[id];
            FILE.remove(path.join(FILES_PATH, id));
        }
    }
}

function addTorrent(magnet, uniqid, client) {
    torrentObjs[uniqid] = new Torrent(magnet, FILES_PATH, uniqid);
    torrentObjs[uniqid].on("downloaded", (path) => {
        //CLOUD.uploadDir(path, oauth2ClientArray[sessionID]);
        torrents[uniqid].uploadTo.forEach(sessionId => {
            uploadDirToDrive(sessionId, { id: uniqid });
        });
    });
    torrentObjs[uniqid].on("info", (info) => {
        torrents[uniqid] = {
            id: uniqid,
            name: info.name,
            infoHash: info.infoHash,
            size: prettyBytes(info.length),
            isTorrent: true,
            length: info.length,
            msg: 'Connecting to peers',
            uploadTo: []
        };
        sendTorrentsUpdate(client, uniqid);
        client.emit("setObj", {
            name: 'magnetLoading',
            value: false
        });
    });
    torrentObjs[uniqid].on("progress", (data) => {
        if ((torrents[uniqid].progress == 100) || !torrents[uniqid]) {
            return;
        }
        var speed = prettyBytes(data.speed) + '/s';
        var downloaded = prettyBytes(data.downloadedLength);
        var progress = percentage((data.downloadedLength / torrents[uniqid].length));
        var peers = data.peers;
        torrents[uniqid].speed = (progress == 100) ? prettyBytes(0) + '/s' : speed;
        torrents[uniqid].downloaded = downloaded;
        torrents[uniqid].progress = progress;
        torrents[uniqid].msg = (progress == 100) ? 'Download completed' : 'Downloading files, peers: ' + peers;
        sendTorrentsUpdate(io, uniqid);
    });
}

//endregion
//region THE MIDDLEWARE
//TODO send pageVisited to its respective user using sessionID
function middleware(data) {
    var sessionID = data.clientRequest.sessionID;
    var session = data.clientRequest.session;
    var newFileName = null;

    if (filter.passed(data) && data.headers['content-length']) {
        if (!session.config.clientDownload.value) {
            data.clientResponse.status(200).send("<script>window.close()</script>");
        }
        var duplicates = Object.keys(visitedPages).filter((key) => {
            return visitedPages[key].url == data.url;
        });
        if (duplicates.length > 0) {
            return;
        }
        debug("DL:%s from %s", data.contentType, data.url);
        var uniqid = shortid.generate();
        var totalLength = data.headers['content-length'];
        var downloadedLength = 0;
        newFileName = uniqid + '.' + mime.extension(data.contentType);
        var completeFilePath = path.join(FILES_PATH, newFileName);
        //create /files if it doesn't exist 
        if (!FILE.existsSync(FILES_PATH)) {
            FILE.mkdirSync(FILES_PATH);
        }
        FILE.closeSync(FILE.openSync(completeFilePath, 'w')); //create an empty file
        var stream = FILE.createWriteStream(completeFilePath);
        data.stream.pipe(stream);
        data.stream.on('data', (chunk) => {
            downloadedLength += chunk.length;
            var progress = percentage((downloadedLength / totalLength));
            if (visitedPages[uniqid]) {
                if (visitedPages[uniqid].cleared) { //download cancelled
                    stream.close();
                    FILE.unlink(completeFilePath);  //delete incomplete file
                    delete visitedPages[uniqid];
                    io.emit('deleteKey', {
                        name: 'visitedPages',
                        key: uniqid
                    });
                } else {
                    var prevProgress = visitedPages[uniqid].progress;
                    if ((progress - prevProgress) > 0.1 || progress == 100) {  //don't clog the socket
                        visitedPages[uniqid].progress = progress;
                        visitedPages[uniqid].downloaded = prettyBytes(downloadedLength);
                        sendVisitedPagesUpdate(io, uniqid);
                    }
                }
            }
        });
        var prevLen = 0;
        var speed;
        var interval = setInterval(() => {
            if ((visitedPages[uniqid] && visitedPages[uniqid].cleared) || !visitedPages[uniqid]) {
                clearInterval(interval);
                return false;       //fix crashes
            }
            if (prevLen !== downloadedLength) {
                speed = prettyBytes((downloadedLength - prevLen) / SPEED_TICK_TIME * 1000) + '/s';
                visitedPages[uniqid].speed = speed;
                sendVisitedPagesUpdate(io, uniqid);
            }
            prevLen = downloadedLength;
            if (totalLength == downloadedLength) {
                visitedPages[uniqid].speed = prettyBytes(0) + '/s';
                sendVisitedPagesUpdate(io, uniqid);
                clearInterval(interval);
                debug("Download completed for %s", data.url);
                var array = visitedPages[uniqid].uploadTo;
                array.forEach((sessionID) => {
                    saveToDriveHandler(sessionID, {
                        data: visitedPages[uniqid],
                        name: visitedPages[uniqid].uploadFileName
                    });
                });
            }
        }, SPEED_TICK_TIME);
        var obj = {
            url: data.url,
            id: uniqid,
            mime: data.contentType,
            size: prettyBytes(data.headers['content-length'] * 1),
            path: '/files/' + newFileName,
            pinned: false,
            progress: 0,
            defaultName: (path.basename(url.parse(data.url).pathname).replace(/%20/gi, " ") || ""),
            length: data.headers['content-length'] * 1,
            uploadTo: []        //holds list of session Ids to upload on dl complete
        };
        visitedPages[uniqid] = obj;
        sendVisitedPagesUpdate(io, uniqid);
    }
}
//endregion
//region socket handlers
function sendVisitedPagesUpdate(socket, id, imp?: Array<string>) {
    var ignore = ["pinned"];
    if (imp)
        imp.forEach((a) => {
            if (ignore.indexOf(a) > -1)
                ignore.splice(ignore.indexOf(a));
        });
    socket.emit('setKey', {
        name: 'visitedPages',
        key: id,
        value: visitedPages[id],
        ignore: ignore
    });
}

function sendTorrentsUpdate(socket, id, imp?: Array<string>) {
    var ignore = ["dirStructure", "showFiles", "pinned"];
    if (imp)
        imp.forEach((a) => {
            if (ignore.indexOf(a) > -1)
                ignore.splice(ignore.indexOf(a));
        });
    socket.emit('setKey', {
        name: 'torrents',
        key: id,
        value: torrents[id],
        ignore: ignore
    });
}
//endregion
//region set up express
var sessionMiddleware = session({
    secret: "XYeMBetaCloud",
    resave: false,
    saveUninitialized: true
});
app.use(sessionMiddleware);
//set up unblocker
app.set("trust proxy", true);
app.use(unblocker(middleware));
app.use('/', express.static(path.join(__dirname, '../static')));
app.use('/files', express.static(FILES_PATH));
app.get("/login/:cloud", (req, res) => {
    var cloud = req.params["cloud"];
    var p = path.join(__dirname, `Storages/${cloud}/login.html`);
    if (FILE.existsSync(p)) {
        res.sendFile(p);
    } else {
        res.end("404");
    }
});
//region for showtime app
require("./showtime.js")(app);
//endregion
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../static', 'index.html'));
});
app.get('/oauthCallback/', (req, res) => {
    var sessionID = req['sessionID'];
    var session = req['session'];
    if (!session.selectedCloud) {
        res.end("Error: socketIO sesssion not initialized.");
        return;
    }
    Storages.getStorage(session.selectedCloud).callbackHandler(req.query, (creds => {
        if (!creds) {
            res.end("Error");
            return;
        }
        session.clouds[session.selectedCloud].creds = creds;
        session.save();
        res.redirect('/');
    }));
});
//endregion
//region set up socket.io to use sessions
io.use(function (socket, next) {
    sessionMiddleware(socket.conn.request, socket.conn.request.res, next);
});
//handle socket.io connections
io.on('connection', function (client) {
    var sessionID = client.conn.request.sessionID;
    var session = client.conn.request.session;
    //Process Session
    if (!session.clouds) {
        session.clouds = Storages.getTemplate();    //an object like : {"Gdrive":{displayName:"..",url:".."},"..":{displayName:"..","url":".."}}
        session.selectedCloud = "GDrive";
        //config
        session.config = {
            clientDownload: {
                value: false,
                displayName: "Stream downloads to user",
                type: "checkbox",
                title: "Choose whether to stream file to client while catching downloads or not, if unchecked windows will close after download is captured."
            },
            csHead: {
                value: true,
                displayName: "Show cloud selection button in main menu",
                type: "checkbox"
            },
            askForName: {
                value: true,
                displayName: "Ask for filename when uploading files",
                type: "checkbox"
            }
        }
        session.save();
    }
    //send config
    client.emit('setObj', {
        name: "config",
        value: session.config
    })
    //send clouds
    client.emit('setObj', {
        name: 'clouds',
        value: session.clouds
    });
    client.emit('setObj', {
        name: 'selectedCloud',
        value: session.clouds[session.selectedCloud]
    });
    //send downloads
    client.emit('setObj', {
        name: 'visitedPages',
        value: visitedPages
    });
    //send torrrents
    client.emit('setObj', {
        name: 'torrents',
        value: torrents
    });
    client.emit('setObj', {
        name: 'incognito',
        value: session.incognito ? session.incognito : false
    });
    client.on('clearVisitedPages', () => {
        Object.keys(visitedPages).forEach((id) => {
            clearVisitedPage(id);
        });
    });
    client.on('clearTorrents', () => {
        Object.keys(torrents).forEach((id) => {
            clearTorrent(id);
        });
    });
    client.on('delete', data => {
        data.isTorrent ? clearTorrent(data.id) : clearVisitedPage(data.id);
    });
    client.on('saveToDrive', (data) => {
        saveToDriveHandler(session, data);
    });
    client.on('pin', (data) => {
        if (data.isTorrent) {
            torrents[data.page.id].pinned = true;
            sendTorrentsUpdate(io, data.page.id, ["pinned"]);
            return false;
        }
        visitedPages[data.page.id].pinned = true;
        sendVisitedPagesUpdate(io, data.page.id, ["pinned"]);
    });
    client.on('unpin', (data) => {
        if (data.isTorrent) {
            torrents[data.page.id].pinned = false;
            sendTorrentsUpdate(io, data.page.id, ["pinned"]);
            return false;
        }
        visitedPages[data.page.id].pinned = false;
        sendVisitedPagesUpdate(io, data.page.id, ["pinned"]);
    });
    client.on('pirateSearch', (data) => {
        var query = data.query;
        var page = data.page;
        scrapeIt(`${TBP_PROXY}/search/${encodeURIComponent(query)}/${page}/7/0`, {
            result: {
                listItem: "tr:not(.header):not(:last-child)",
                data: {
                    name: "a.detLink",
                    size: {
                        selector: ".detDesc",
                        convert: x => { return x.match(/Size (.*),/)[1]; }
                    },
                    seeders: {
                        selector: "td",
                        eq: 2
                    },
                    leechers: {
                        selector: "td",
                        eq: 3
                    },
                    magnetLink: {
                        selector: "a",
                        eq: 3,
                        attr: "href"
                    },
                    link: {
                        selector: "a.detLink",
                        attr: "href",
                        convert: x => `https://thepiratebay.org${x}`
                    }
                }
            }
        }).then(data => {
            client.emit('setObj', {
                name: 'search',
                value: {
                    results: data.result,
                    loading: false
                }
            });
        });
    });
    client.on('addTorrent', (data) => {
        var dupes = Object.keys(torrents).filter((key) => {
            return magnet.decode(data.magnet).infoHash == torrents[key].infoHash;
        });
        if (dupes.length > 0) {
            return false;
        }
        var uniqid = shortid();
        if (!data.magnet.startsWith("magnet")) {
            //try to load magnet
            magnetLink(data.magnet, (err, link) => {
                if (err) {
                    debug(`Failed to load magnet from torrent: ${err.message}`);
                    client.emit("setObj", {
                        name: 'magnetLoading',
                        value: false
                    });
                    client.emit("alert", "Unable to load the .torrent");
                    return;
                }
                //all good !! add magnet
                addTorrent(link, uniqid, client);
            });
            return;
        }
        addTorrent(data.magnet, uniqid, client);
    });
    client.on('getDirStructure', (data) => {
        var id = data.id;
        var dirStructure = torrentObjs[id].getDirObj();
        torrents[id].gettingDirStructure = false;
        torrents[id].dirStructure = dirStructure;
        torrents[id].msg = 'Got directory structure';
        torrents[id].showFiles = true;
        sendTorrentsUpdate(client, id);
        //fix directory structure not hidden after page reload
        torrents[id].showFiles = false;
    });
    client.on("uploadDirToDrive", (data) => {
        uploadDirToDrive(session, data);
    });
    client.on("zip", (data) => {
        //exclusively for torrents
        var id = data.id;
        if (torrents[id].zipping || torrents[id].progress < 100) {
            //invalid context
            return false;
        }
        var zippedLength = 0;
        //no need to check if zip exists
        //event will emit only if zipExists is not set
        var output = FILE.createWriteStream(path.join(FILES_PATH, id + ".zip"));
        var archive = archiver('zip', {
            store: true // Sets the compression method to STORE.
        });
        // listen for all archive data to be written
        output.on('close', function () {
            debug("Zipped %s successfully", id);
            torrents[id].zipping = false;
            torrents[id].msg = "Zipped Successfully"
            torrents[id].zipExists = true;
            sendTorrentsUpdate(io, id);
        });
        archive.on('error', function (err) {
            debug("Error while zipping %s : %s", id, err);
        });
        // pipe archive data to the file
        archive.pipe(output);
        archive.directory(path.join(FILES_PATH, id), false);
        archive.finalize();
        var percent = 0;
        //listen for progress
        archive.on("data", (chunk) => {
            zippedLength += chunk.length;
            var percentNow = percentage(zippedLength / torrents[id].length);
            if ((percentNow - percent) > 0.1 || percentNow == 100) {
                percent = percentNow;
                torrents[id].msg = "Zipping : " + percentNow + "%";
                torrents[id].zipping = true;
                sendTorrentsUpdate(io, id);
            }
        });
    });
    client.on("toggleIncognito", () => {
        session.incognito = !session.incognito;
        session.save();
    });
    client.on("uploadZipToCloud", (data) => {
        var id = data.id;
        var name = data.name;
        var loc = path.join(FILES_PATH, id + ".zip");
        var cloud = Storages.getStorage(session.selectedCloud);
        var cloudInstance = new cloud(session.clouds[session.selectedCloud].creds);
        if (!cloudInstance.uploadFile) {
            visitedPages[id].msg = "Feature Unavailable";
            sendVisitedPagesUpdate(io, id);
            return;
        }
        cloudInstance.uploadFile(FILE.createReadStream(loc), FILE.statSync(loc).size, mime.lookup(loc), name, false);
        cloudInstance.on("progress", (data) => {
            torrents[id].msg = "Uploading Zip: " + percentage(data.uploaded / data.size) + "%";
            torrents[id].zipping = true;
            sendTorrentsUpdate(io, id);
        });
        cloudInstance.on("fileUploaded", (data) => {
            torrents[id].msg = "Uploaded Zip Successfully";
            torrents[id].zipping = false;
            sendTorrentsUpdate(io, id);
        });
    });
    client.on("selectCloud", (data) => {
        var cloud = data.cloud;
        if (session.clouds[cloud]) {
            session.selectedCloud = cloud;
            session.save();
            client.emit('setObj', {
                name: 'selectedCloud',
                value: session.clouds[session.selectedCloud]
            });
        }
    });
    client.on("updateConfig", config => {
        session.config = config;
        session.save();
    })
});
//endregion
server.listen(PORT);
debug('Server Listening on port:', PORT);
console.log("Server Started");
