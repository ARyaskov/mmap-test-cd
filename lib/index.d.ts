declare module 'mmap-io' {
    const mmap: {
        map(size: number, protection: number, flags: number, fd: number, offset?: number): SharedArrayBuffer;
        unmap(buffer: Buffer): void;
        PROT_READ: number;
        PROT_WRITE: number;
        PROT_EXEC: number;
        PROT_NONE: number;
        MAP_SHARED: number;
        MAP_PRIVATE: number;
    };
    export default mmap;
}