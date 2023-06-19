#IFNDEF XEC_RPC_NETWORK_H

if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react-pixi-alias.production.min.js");
} else {
  module.exports = require("./cjs/react-pixi-alias.development.js");
}
