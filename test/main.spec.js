const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const os = require('os')
const mmap = require('../src/index.js')

describe('mmap-io', () => {
  const testDir = path.join(os.tmpdir(), 'mmap-test')
  const testFile = path.join(testDir, 'test.txt')
  const largeFile = path.join(testDir, 'large.txt')
  const testContent = 'Hello, Memory Mapped World!'
  const testSize = 1024

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir)
    }
    fs.writeFileSync(testFile, testContent)
    fs.truncateSync(testFile, testSize)

    const largeContent = 'Prefix' + 'A'.repeat(1024) + 'Suffix'
    fs.writeFileSync(largeFile, largeContent)
  })

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  describe('Low-level mmap operations', () => {
    it('should map file with basic read protection', () => {
      const fd = fs.openSync(testFile, 'r')
      const stats = fs.fstatSync(fd)
      const buffer = mmap.map(stats.size, mmap.PROT_READ, mmap.MAP_SHARED, fd)

      expect(buffer).to.be.instanceOf(SharedArrayBuffer)
      expect(buffer.byteLength).to.equal(stats.size)

      mmap.unmap(buffer)
      fs.closeSync(fd)
    })

    it('should map file with read-write protection', () => {
      const fd = fs.openSync(testFile, 'r+')
      const stats = fs.fstatSync(fd)
      const buffer = mmap.map(stats.size, mmap.PROT_READ | mmap.PROT_WRITE, mmap.MAP_SHARED, fd)

      expect(buffer).to.be.instanceOf(SharedArrayBuffer)

      mmap.unmap(buffer)
      fs.closeSync(fd)
    })

    it('should map file with specific offset', () => {
      const fd = fs.openSync(largeFile, 'r')
      const stats = fs.fstatSync(fd)
      const offset = 6 // Skip "Prefix"
      const buffer = mmap.map(stats.size - offset, mmap.PROT_READ, mmap.MAP_SHARED, fd, offset)

      expect(buffer).to.be.instanceOf(SharedArrayBuffer)
      const view = new Uint8Array(buffer)
      expect(String.fromCharCode(view[0])).to.equal('A')

      mmap.unmap(buffer)
      fs.closeSync(fd)
    })

    it('should throw error when mapping with invalid protection flags', () => {
      const fd = fs.openSync(testFile, 'r')
      const stats = fs.fstatSync(fd)

      expect(() => {
        mmap.map(stats.size, -1, mmap.MAP_SHARED, fd)
      }).to.throw()

      fs.closeSync(fd)
    })
  })

  describe('High-level file mapping', () => {
    it('should map file for reading', () => {
      const sab = mmap.mapReadFile(testFile)
      expect(sab).to.be.instanceOf(SharedArrayBuffer)
      const content = mmap.extractString(sab)
      expect(content).to.equal(testContent)
      mmap.unmapFile(sab)
    })

    it('should map file for writing', () => {
      const sab = mmap.mapWriteFile(testFile)
      const newContent = 'Modified content'
      mmap.putStringAtPosition(sab, newContent)
      expect(mmap.extractString(sab)).to.equal(newContent)
      mmap.unmapFile(sab)

      const fileContent = fs.readFileSync(testFile, 'utf8', 0, newContent.length)
      expect(fileContent).to.equal(newContent)
    })

    it('should handle non-existent files appropriately', () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.txt')
      expect(() => {
        mmap.mapReadFile(nonExistentFile)
      }).to.throw()
    })
  })

  describe('Buffer operations', () => {
    let sab

    beforeEach(() => {
      sab = mmap.mapWriteFile(testFile)
    })

    afterEach(() => {
      if (sab) {
        mmap.unmapFile(sab)
        sab = null
      }
    })

    it('should write string at specific position', () => {
      const str = 'test'
      const pos = 5
      mmap.putStringAtPosition(sab, str, pos)
      const content = mmap.extractString(sab)
      expect(content.substring(pos, pos + str.length)).to.equal(str)
    })

    it('should write string at beginning when position not specified', () => {
      const str = 'test'
      mmap.putStringAtPosition(sab, str)
      const content = mmap.extractString(sab)
      expect(content.startsWith(str)).to.be.true
    })

    it('should write byte at specific position', () => {
      const byte = 65 // ASCII 'A'
      const pos = 10
      mmap.putByteAtPosition(sab, byte, pos)
      const view = new Uint8Array(sab)
      expect(view[pos]).to.equal(byte)
    })

    it('should write buffer at specific position', () => {
      const buffer = Buffer.from([1, 2, 3, 4])
      const pos = 5
      mmap.putBufferAtPosition(sab, buffer, pos)
      const view = new Uint8Array(sab)
      const writtenData = Array.from(view.slice(pos, pos + buffer.length))
      expect(writtenData).to.deep.equal([1, 2, 3, 4])
    })

    it('should handle string operations with unicode characters', () => {
      const str = 'Hello 世界!'
      mmap.putStringAtPosition(sab, str)
      const content = mmap.extractString(sab)
      expect(content.startsWith(str)).to.be.true
    })

    it('should throw error when writing beyond buffer bounds', () => {
      const str = 'A'.repeat(testSize + 1)
      expect(() => {
        mmap.putStringAtPosition(sab, str)
      }).to.throw()
    })

    it('should throw error when writing at invalid position', () => {
      expect(() => {
        mmap.putStringAtPosition(sab, 'test', testSize + 1)
      }).to.throw()
    })
  })

  describe('Error handling', () => {
    it('should handle invalid SharedArrayBuffer in unmap', () => {
      expect(() => {
        mmap.unmapFile(new SharedArrayBuffer(10))
      }).to.throw()
    })

    it('should handle null/undefined buffer in operations', () => {
      expect(() => {
        mmap.extractString(null)
      }).to.throw()

      expect(() => {
        mmap.putStringAtPosition(undefined, 'test')
      }).to.throw()
    })

    it('should handle invalid buffer type', () => {
      expect(() => {
        mmap.putBufferAtPosition(new SharedArrayBuffer(10), 'not a buffer', 0)
      }).to.throw()
    })

    it('should handle invalid byte values', () => {
      const sab = mmap.mapWriteFile(testFile)
      expect(() => {
        mmap.putByteAtPosition(sab, 256, 0) // Byte value too large
      }).to.throw()
      mmap.unmapFile(sab)
    })
  })
})
