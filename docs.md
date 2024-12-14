# @riaskov/mmap

A high-performance Node.js native module for memory-mapped file operations, providing low-level access to the operating system's memory mapping capabilities through a convenient JavaScript interface.

## Installation

```bash
npm install @riaskov/mmap
```

Or if you're using Yarn:

```bash
yarn add @riaskov/mmap
```

## System Requirements

- Node.js versions: ^18.17.0 || >=20.5.0
- Supported platforms: Windows, Linux, and macOS
- Build tools: node-gyp and a compatible C++ compiler

## Basic Usage

```javascript
import mmap from '@riaskov/mmap';

// Read a file using memory mapping
const buffer = mmap.mapReadFile('large-file.txt');

// Extract content as a string
const content = mmap.extractString(buffer);

// Modify content at specific position
mmap.putStringAtPosition(buffer, 'Hello, World!', 0);

// Clean up
mmap.unmapFile(buffer);
```

## Core Functions

### File Mapping Operations

#### `mapReadFile(filename: string): SharedArrayBuffer`

Maps an entire file into memory for read-only access.

```javascript
const buffer = mmap.mapReadFile('data.txt');
```

#### `mapWriteFile(filename: string): SharedArrayBuffer`

Maps an entire file into memory for read-write access.

```javascript
const buffer = mmap.mapWriteFile('data.txt');
```

#### `unmapFile(buffer: SharedArrayBuffer): void`

Unmaps a previously mapped file from memory.

```javascript
mmap.unmapFile(buffer);
```

### Low-Level Memory Mapping

#### `map(size: number, protection: MapProtectionFlags, flags: MapFlags, fd: FileDescriptor, offset?: number): SharedArrayBuffer`

Creates a memory mapping with specific protection and sharing flags.

```javascript
const fd = fs.openSync('file.txt', 'r');
const stats = fs.fstatSync(fd);
const buffer = mmap.map(
    stats.size,
    mmap.PROT_READ,
    mmap.MAP_SHARED,
    fd
);
```

#### `unmap(buffer: SharedArrayBuffer): void`

Unmaps a memory region previously created with `map()`.

```javascript
mmap.unmap(buffer);
```

### Buffer Manipulation

#### `extractString(buffer: SharedArrayBuffer): string`

Extracts a string from a mapped memory region.

```javascript
const content = mmap.extractString(buffer);
```

#### `putStringAtPosition(buffer: SharedArrayBuffer, str: string, position?: number): void`

Writes a string to a specific position in the mapped memory.

```javascript
mmap.putStringAtPosition(buffer, 'Hello', 0);
```

#### `putByteAtPosition(buffer: SharedArrayBuffer, byte: number, position?: number): void`

Writes a single byte at a specific position.

```javascript
mmap.putByteAtPosition(buffer, 65, 0); // Writes 'A'
```

#### `putBufferAtPosition(buffer: SharedArrayBuffer, srcBuffer: Buffer, position?: number): void`

Copies the contents of a Node.js Buffer to a specific position in the mapped memory.

```javascript
const sourceBuffer = Buffer.from('Hello');
mmap.putBufferAtPosition(buffer, sourceBuffer, 0);
```

## Constants

### Protection Flags

These flags control memory access permissions:

- `PROT_NONE`: No access allowed
- `PROT_READ`: Read permission
- `PROT_WRITE`: Write permission
- `PROT_EXEC`: Execute permission

### Mapping Flags

These flags control the mapping behavior:

- `MAP_SHARED`: Updates to the mapping are visible to other processes
- `MAP_PRIVATE`: Updates to the mapping are private to the current process
- `MAP_NONBLOCK`: Non-blocking mode
- `MAP_POPULATE`: Populate page tables for the mapping

## TypeScript Support

The package includes comprehensive TypeScript definitions. Here's an example of using the typed interface:

```typescript
import mmap, { PROT, MAP } from '@riaskov/mmap';

const buffer = mmap.map(
    1024,
    PROT.READ | PROT.WRITE,
    MAP.SHARED | MAP.NONBLOCK,
    fd
);
```

## Error Handling

The library throws errors in the following cases:

- Invalid file descriptors
- Invalid protection or mapping flags
- Out-of-bounds memory access
- Invalid buffer types or positions
- File system errors
- Memory allocation failures

Example of proper error handling:

```javascript
try {
    const buffer = mmap.mapReadFile('file.txt');
    // Work with the buffer
    mmap.unmapFile(buffer);
} catch (error) {
    console.error('Memory mapping error:', error);
}
```

## Performance Considerations

Memory mapping can provide significant performance benefits when:

- Working with large files
- Requiring random access to file contents
- Sharing memory between processes
- Performing many small reads or writes

However, be mindful of:

- Virtual memory consumption
- Page table usage
- File system cache interaction
- System memory pressure

## Platform-Specific Notes

### Windows
- Uses the Windows memory mapping API (`CreateFileMapping`, `MapViewOfFile`)
- Supports both 32-bit and 64-bit processes
- File handles are managed through Windows HANDLE objects

### Unix-like Systems (Linux, macOS)
- Uses the POSIX mmap interface
- Supports standard Unix file descriptors
- Benefits from the unified buffer cache

## License

MIT License - See the LICENSE file in the package repository for details.

## Contributing

Contributions are welcome! Please see the CONTRIBUTING.md file in the repository for guidelines.

## Support

For bug reports and feature requests, please use the GitHub issue tracker.