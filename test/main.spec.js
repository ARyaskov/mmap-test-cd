const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const mmap = require('../')

describe('mmap-io', () => {
  const testFile = path.join(os.tmpdir(), 'mmap-test.txt')
  const testContent = 'Hello, Memory Mapped World!'
  const testSize = 1024
  let fd

  before(() => {
    console.log('Before')
    fs.writeFileSync(testFile, testContent)
    fs.truncateSync(testFile, testSize)
  })

  beforeEach(() => {
    console.log('Before each')
    fd = fs.openSync(testFile, 'r')
  })

  afterEach(() => {
    console.log('After each')
    if (fd !== undefined) {
      fs.closeSync(fd)
      fd = undefined
    }
  })

  after(() => {
    console.log('After')
    fs.unlinkSync(testFile)
  })

  it('should map file to buffer', () => {
    const sab = mmap.map(testSize, mmap.PROT_READ, mmap.MAP_SHARED, fd)

    expect(sab).to.be.instanceOf(SharedArrayBuffer)
    expect(sab.byteLength).to.equal(testSize)

    const uint8 = new Uint8Array(sab)
    const sabText = new TextDecoder().decode(uint8)

    expect(sabText).to.equal(testContent)

    mmap.unmap(sab)
  })

  it('should handle writing to memory', () => {
    fd = fs.openSync(testFile, 'r+')
    const sab = mmap.map(
        testSize,
        mmap.PROT_READ | mmap.PROT_WRITE,
        mmap.MAP_SHARED,
        fd,
    )

    const newContent = 'Modified content'
    new Uint8Array(sab).set(new TextEncoder().encode(newContent))

    mmap.unmap(sab)

    const result = fs.readFileSync(testFile, 'utf8', 0, newContent.length)
    expect(result).to.equal(newContent)
  })
})
