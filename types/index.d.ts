declare module '@riaskov/mmap' {
    export type FileDescriptor = number;

    export const enum PROT {
        NONE = 0,
        READ = 1,
        WRITE = 2,
        EXEC = 4
    }

    export const enum MAP {
        SHARED = 1,
        PRIVATE = 2,
        NONBLOCK = 65536,
        POPULATE = 32768
    }

    export type MapProtectionFlags =
        | PROT.NONE
        | PROT.READ
        | PROT.WRITE
        | PROT.EXEC
        | (PROT.READ | PROT.WRITE)
        | (PROT.READ | PROT.EXEC)
        | (PROT.WRITE | PROT.EXEC)
        | (PROT.READ | PROT.WRITE | PROT.EXEC);

    export type MapFlags =
        | MAP.SHARED
        | MAP.PRIVATE
        | (MAP.SHARED | MAP.NONBLOCK)
        | (MAP.SHARED | MAP.POPULATE)
        | (MAP.PRIVATE | MAP.NONBLOCK)
        | (MAP.PRIVATE | MAP.POPULATE);

    export interface MmapIo {
        map(
            size: number,
            protection: MapProtectionFlags,
            flags: MapFlags,
            fd: FileDescriptor,
            offset?: number
        ): SharedArrayBuffer;

        unmap(buffer: SharedArrayBuffer): void;

        mapReadFile(filename: string): SharedArrayBuffer;
        mapWriteFile(filename: string): SharedArrayBuffer;
        unmapFile(buffer: SharedArrayBuffer): void;

        extractString(buffer: SharedArrayBuffer): string;
        putStringAtPosition(buffer: SharedArrayBuffer, str: string, position?: number): void;
        putByteAtPosition(buffer: SharedArrayBuffer, byte: number, position?: number): void;
        putBufferAtPosition(buffer: SharedArrayBuffer, srcBuffer: Buffer, position?: number): void;

        readonly PROT_READ: PROT.READ;
        readonly PROT_WRITE: PROT.WRITE;
        readonly PROT_EXEC: PROT.EXEC;
        readonly PROT_NONE: PROT.NONE;
        readonly MAP_SHARED: MAP.SHARED;
        readonly MAP_PRIVATE: MAP.PRIVATE;
        readonly MAP_NONBLOCK: MAP.NONBLOCK;
        readonly MAP_POPULATE: MAP.POPULATE;
    }

    const mmap: MmapIo;
    export default mmap;
}