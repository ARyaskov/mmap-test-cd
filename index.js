const binary = require("@mapbox/node-pre-gyp")
const path = require("path")
const binding_path = binary.find(
  path.resolve(path.join(__dirname, "./package.json")),
)

try {
  module.exports = require(binding_path)
} catch (err) {
  console.error("Error while loading native module mmap-io:", err.message)
  console.error("Module path:", binding_path)
  throw err
}
