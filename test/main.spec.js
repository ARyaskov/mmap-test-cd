const { expect } = require("chai")
const fs = require("fs")
const path = require("path")
const os = require("os")
const mmap = require("../mmap-io")

describe("mmap-io", function () {
  this.timeout(5000)

  const testFile = path.join(os.tmpdir(), "mmap-test-file.txt")
  const testContent = "Hello, Memory Mapped World!"
  const testSize = 1024 // 1KB

  let fd = -1

  beforeEach(function () {
    fs.writeFileSync(testFile, testContent)
    fs.truncateSync(testFile, testSize)
  })

  afterEach(function () {
    if (fd !== -1) {
      try {
        fs.closeSync(fd)
        fd = -1
      } catch (e) {}
    }
    try {
      fs.unlinkSync(testFile)
    } catch (e) {
      console.error("Cleanup failed:", e)
    }
  })

  describe("Basic Memory Mapping Operations", () => {
    it("should map a file for reading", function () {
      fd = fs.openSync(testFile, "r")

      const buffer = mmap.map(testSize, mmap.PROT_READ, mmap.MAP_SHARED, fd)

      expect(buffer).to.be.instanceOf(Buffer)
      expect(buffer.byteLength).to.equal(testSize)

      const view = Buffer.from(buffer)
      const content = view.toString("utf8", 0, testContent.length)
      expect(content).to.equal(testContent)
    })

    it("should map a file for writing", function () {
      fd = fs.openSync(testFile, "r+")

      const buffer = mmap.map(
        testSize,
        mmap.PROT_READ | mmap.PROT_WRITE,
        mmap.MAP_SHARED,
        fd,
      )

      const view = Buffer.from(buffer)
      const newContent = "Updated content"
      view.write(newContent)

      fs.writeSync(fd, view, 0, newContent.length)
      fs.fsyncSync(fd)

      const fileContent = fs.readFileSync(testFile, "utf8")
      expect(fileContent.substring(0, newContent.length)).to.equal(newContent)
    })
  })

  describe("Anonymous Mapping", () => {
    it("should create and manipulate anonymous memory", function () {
      const pageSize = mmap.PAGESIZE
      const buffer = mmap.map(
        pageSize,
        mmap.PROT_READ | mmap.PROT_WRITE,
        mmap.MAP_PRIVATE | mmap.MAP_SHARED,
        -1,
      )

      expect(buffer).to.be.instanceOf(Buffer)
      expect(buffer.byteLength).to.equal(pageSize)

      const view = new Int32Array(buffer)
      const testValue = 42
      view[0] = testValue
      expect(view[0]).to.equal(testValue)
    })
  })

  describe("Memory Advice Management", () => {
    it("should handle memory advice", function () {
      fd = fs.openSync(testFile, "r")
      const buffer = mmap.map(testSize, mmap.PROT_READ, mmap.MAP_SHARED, fd)

      const view = Buffer.from(buffer)

      expect(() => mmap.advise(view, mmap.MADV_NORMAL)).not.to.throw()
    })
  })
})
