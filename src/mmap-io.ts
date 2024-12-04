import path from "path"

const binary = require("@mapbox/node-pre-gyp")
const binding_path = binary.find(
    path.resolve(path.join(__dirname, "../package.json")),
)
const mmap_lib_raw_ = require(binding_path)

type FileDescriptor = number

export type MapProtectionFlags =
    | MmapIo["PROT_NONE"]
    | MmapIo["PROT_READ"]
    | MmapIo["PROT_WRITE"]
    | MmapIo["PROT_EXEC"]
    | 3 // PROT_READ | PROT_WRITE
    | 5 // PROT_READ | PROT_EXEC
    | 6 // PROT_WRITE | PROT_EXEC
    | 7 // PROT_READ | PROT_WRITE | PROT_EXEC

type MapFlags = MmapIo["MAP_PRIVATE"] | MmapIo["MAP_SHARED"] | number

type MapAdvise =
    | MmapIo["MADV_NORMAL"]
    | MmapIo["MADV_RANDOM"]
    | MmapIo["MADV_SEQUENTIAL"]
    | MmapIo["MADV_WILLNEED"]
    | MmapIo["MADV_DONTNEED"]

type MmapIo = {
    map(
        size: number,
        protection: MapProtectionFlags,
        flags: MapFlags,
        fd: FileDescriptor,
        offset?: number,
        advise?: MapAdvise,
        name?: Buffer,
    ): Buffer

    advise(
        buffer: Buffer,
        offset: number,
        length: number,
        advise: MapAdvise,
    ): void
    advise(buffer: Buffer, advise: MapAdvise): void

    sync(
        buffer: Buffer,
        offset?: number,
        size?: number,
        blocking_sync?: boolean,
        invalidate_pages?: boolean,
    ): void

    sync(buffer: Buffer, blocking_sync: boolean, invalidate_pages?: boolean): void

    readonly PROT_READ: 1
    readonly PROT_WRITE: 2
    readonly PROT_EXEC: 4
    readonly PROT_NONE: 0
    readonly MAP_SHARED: 1
    readonly MAP_PRIVATE: 2
    readonly MAP_NONBLOCK: 65536
    readonly MAP_POPULATE: 32768
    readonly MADV_NORMAL: 0
    readonly MADV_RANDOM: 1
    readonly MADV_SEQUENTIAL: 2
    readonly MADV_WILLNEED: 3
    readonly MADV_DONTNEED: 4
    readonly PAGESIZE: number
}

// Getting sync function from the native module
const raw_sync_fn_ = mmap_lib_raw_.sync_lib_private__

// Hide the original C++ function from users
delete mmap_lib_raw_.sync_lib_private__

// Create a wrapper for sync function with improved parameter handling
mmap_lib_raw_.sync = function (
    buf: Buffer,
    par_a?: number | boolean,
    par_b?: number | boolean,
    par_c?: boolean,
    par_d?: boolean,
): void {
    if (typeof par_a === "boolean") {
        raw_sync_fn_(buf, 0, buf.length, par_a, par_b || false)
    } else {
        raw_sync_fn_(
            buf,
            par_a || 0,
            par_b || buf.length,
            par_c || false,
            par_d || false,
        )
    }
}

const mmap = mmap_lib_raw_ as MmapIo
export default mmap
