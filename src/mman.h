#ifndef MMAN_H
#define MMAN_H

#ifdef _WIN32
#include <io.h>
#include <windows.h>

#define PROT_NONE  0x00
#define PROT_READ  0x01
#define PROT_WRITE 0x02
#define PROT_EXEC  0x04
#define MAP_SHARED 0x01
#define MAP_PRIVATE 0x02
#define MAP_FAILED ((void*) -1)

#endif
#endif