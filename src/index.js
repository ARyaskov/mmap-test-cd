const binary = require('@mapbox/node-pre-gyp')
const path = require('path')
const fs = require('fs')

const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')))

let nativeModule
try {
  nativeModule = require(binding_path)
} catch (err) {
  console.error('Error while loading native module mmap-io:', err.message)
  console.error('Module path:', binding_path)
  throw err
}

function mapReadFile(filename) {
  const fd = fs.openSync(filename, 'r')
  try {
    const stats = fs.fstatSync(fd)
    return nativeModule.map(stats.size, nativeModule.PROT_READ, nativeModule.MAP_SHARED | nativeModule.MAP_NONBLOCK, fd)
  } finally {
    fs.closeSync(fd)
  }
}

function mapWriteFile(filename) {
  const fd = fs.openSync(filename, 'r+')
  try {
    const stats = fs.fstatSync(fd)
    return nativeModule.map(
      stats.size,
      nativeModule.PROT_READ | nativeModule.PROT_WRITE,
      nativeModule.MAP_SHARED | nativeModule.MAP_NONBLOCK,
      fd
    )
  } finally {
    fs.closeSync(fd)
  }
}

function unmapFile(buffer) {
  nativeModule.unmap(buffer)
}

module.exports = {
  ...nativeModule,
  mapReadFile,
  mapWriteFile,
  unmapFile
}
