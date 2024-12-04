#ifndef MMAN_H
#define MMAN_H

#include <io.h>
#include <errno.h>
#include <windows.h>
#include <sys/types.h>
#include <memory>
#include <system_error>

// Protection flags
#define PROT_NONE       0x00
#define PROT_READ       0x01
#define PROT_WRITE      0x02
#define PROT_EXEC       0x04

// Map flags
#define MAP_FILE        0x00
#define MAP_SHARED      0x01
#define MAP_PRIVATE     0x02
#define MAP_TYPE        0x0F
#define MAP_ANONYMOUS   0x20
#define MAP_FAILED      ((void*) -1)

// Synchronization flags
#define MS_ASYNC        0x01
#define MS_SYNC         0x02
#define MS_INVALIDATE   0x04

// Advice flags
#define MADV_NORMAL     0x00
#define MADV_RANDOM     0x01
#define MADV_SEQUENTIAL 0x02
#define MADV_WILLNEED   0x03
#define MADV_DONTNEED   0x04

namespace {
    // Helper function to get proper protection flags
    DWORD get_protection_flags(int prot) {
        if (prot & PROT_WRITE) {
            return (prot & PROT_EXEC) ? PAGE_EXECUTE_READWRITE : PAGE_READWRITE;
        }
        if (prot & PROT_EXEC) {
            return (prot & PROT_READ) ? PAGE_EXECUTE_READ : PAGE_EXECUTE;
        }
        return PAGE_READONLY;
    }

    // Helper function to get proper access flags
    DWORD get_access_flags(int prot, int flags) {
        DWORD access = 0;
        if (prot & PROT_WRITE) access |= FILE_MAP_WRITE;
        if (prot & PROT_READ)  access |= FILE_MAP_READ;
        if (prot & PROT_EXEC)  access |= FILE_MAP_EXECUTE;
        if (flags & MAP_PRIVATE) access |= FILE_MAP_COPY;
        return access;
    }
}

inline void* mmap(void* addr, size_t length, int prot, int flags, int fd, size_t offset, LPCSTR name = nullptr) {
    // Validate input parameters
    if (prot & ~(PROT_READ | PROT_WRITE | PROT_EXEC)) {
        errno = EINVAL;
        return MAP_FAILED;
    }

    if (fd == -1) {
        if (!(flags & MAP_ANONYMOUS) || offset) {
            errno = EINVAL;
            return MAP_FAILED;
        }
    } else if (flags & MAP_ANONYMOUS) {
        errno = EINVAL;
        return MAP_FAILED;
    }

    // Calculate size and offset for 32/64 bit systems
    const DWORD dwSizeLow = static_cast<DWORD>(length & 0xFFFFFFFF);
    const DWORD dwSizeHigh = static_cast<DWORD>((length >> 32) & 0xFFFFFFFF);
    const DWORD dwOffsetLow = static_cast<DWORD>(offset & 0xFFFFFFFF);
    const DWORD dwOffsetHigh = static_cast<DWORD>((offset >> 32) & 0xFFFFFFFF);

    // Get file handle
    HANDLE hFile = (fd != -1) ?
        reinterpret_cast<HANDLE>(_get_osfhandle(fd)) :
        INVALID_HANDLE_VALUE;

    // Create file mapping
    DWORD protect = get_protection_flags(prot);
    HANDLE hMapFile = CreateFileMappingA(hFile, nullptr, protect, dwSizeHigh, dwSizeLow, name);

    if (!hMapFile) {
        errno = GetLastError();
        return MAP_FAILED;
    }

    // Map view of file
    DWORD access = get_access_flags(prot, flags);
    void* mapAddress = MapViewOfFile(hMapFile, access, dwOffsetHigh, dwOffsetLow, length);

    // Close file mapping handle
    CloseHandle(hMapFile);

    if (!mapAddress) {
        errno = GetLastError();
        return MAP_FAILED;
    }

    return mapAddress;
}

inline int munmap(void* addr, size_t length) {
    if (!UnmapViewOfFile(addr)) {
        errno = GetLastError();
        return -1;
    }
    return 0;
}

inline int msync(void* addr, size_t length, int flags) {
    if (!FlushViewOfFile(addr, length)) {
        errno = GetLastError();
        return -1;
    }

    // If MS_SYNC is specified, ensure data is written to disk
    if ((flags & MS_SYNC) && !FlushFileBuffers(GetCurrentProcess())) {
        errno = GetLastError();
        return -1;
    }

    return 0;
}

inline int madvise(void* addr, size_t length, int advice) {
    // Windows doesn't have direct equivalent to madvise
    return 0;
}

inline int mincore(void* addr, size_t length, unsigned char* vec) {
    // Windows doesn't support mincore directly
    errno = ENOSYS;
    return -1;
}

#endif // MMAN_H
