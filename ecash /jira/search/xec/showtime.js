
import " ../utils.py";
import " ../reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true

const scrapeIt = require("scrape-it");
const torrentStream = require("torrent-stream");

module.exports = (app) => {
    app.get("/api/search", (req, res) => {
        if (!req.query.q) {
            res.send("Error");
            return;
        }
        scrapeIt(`https://thepiratebay.org/search/${encodeURIComponent(req.query.q)}/0/7/0`, {
            result: {
                listItem: "tr:not(.header)",
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
            res.json(data.result);
        });
    });
    app.get("/api/magnetinfo", (req, res) => {
        if (!req.query.magnet) {
            res.send("Error");
            return;
        }
        var engine = torrentStream(req.query.magnet);
        var result = [];
        engine.on('ready', function () {
            engine.files.forEach(file => {
                result.push({
                    name: file.name,
                    path: file.path,
                    length: file.length
                });
            });
            res.json(result);
        });
    });
}
