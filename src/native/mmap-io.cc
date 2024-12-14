#include <nan.h>
#include <node.h>
#include <string>
#include <cstring>

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

#else
#include <sys/mman.h>
#endif

using v8::SharedArrayBuffer;
using v8::ArrayBuffer;
using v8::Local;
using v8::Value;
using v8::Object;
using v8::Number;
using v8::String;
using v8::FunctionTemplate;

NAN_METHOD(NodeMmap) {
    if (info.Length() < 4) {
        return Nan::ThrowError("Wrong number of arguments");
    }

    size_t size = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    if (size == 0) {
        return Nan::ThrowError("Size must be greater than 0");
    }

    int prot = info[1]->Int32Value(Nan::GetCurrentContext()).FromJust();
    int flags = info[2]->Int32Value(Nan::GetCurrentContext()).FromJust();
    int fd = info[3]->Int32Value(Nan::GetCurrentContext()).FromJust();
    size_t offset = info.Length() > 4 ?
        info[4]->Uint32Value(Nan::GetCurrentContext()).FromJust() : 0;

    if (fd < 0) {
        return Nan::ThrowError("Invalid file descriptor");
    }

    void* data = nullptr;

#ifdef _WIN32
    HANDLE handle = (HANDLE)uv_get_osfhandle(fd);
    if (handle == INVALID_HANDLE_VALUE) {
        DWORD error = GetLastError();
        fprintf(stderr, "mmap: Invalid handle from fd %d, error: %lu\n", fd, error);
        return Nan::ThrowError("Invalid file handle");
    }

    DWORD protect = (prot & PROT_WRITE) ? PAGE_READWRITE : PAGE_READONLY;
    fprintf(stderr, "mmap: Protection flags: %lu (Write: %s)\n", protect,
            (prot & PROT_WRITE) ? "Yes" : "No");

    HANDLE map = CreateFileMappingA(handle, NULL, protect, 0, size, NULL);
    if (map == NULL) {
        DWORD error = GetLastError();
        fprintf(stderr, "mmap: CreateFileMappingA failed, error: %lu\n", error);
        return Nan::ThrowError("Failed to create file mapping");
    }

    DWORD access = (prot & PROT_WRITE) ? FILE_MAP_WRITE : FILE_MAP_READ;
    fprintf(stderr, "mmap: Access flags: %lu\n", access);

    data = MapViewOfFile(map, access, 0, offset, size);
    if (data == NULL) {
        DWORD error = GetLastError();
        fprintf(stderr, "mmap: MapViewOfFile failed, error: %lu\n", error);
        CloseHandle(map);
        return Nan::ThrowError("Failed to map view of file");
    }

    CloseHandle(map);
#else
    data = mmap(nullptr, size, prot, flags, fd, offset);
    if (data == MAP_FAILED) {
        return Nan::ThrowError("mmap failed");
    }
#endif

     std::shared_ptr<v8::BackingStore> backing_store =
           v8::SharedArrayBuffer::NewBackingStore(
               data,
               size,
               [](void* data, size_t length, void* deleter_data) {
                   #ifdef _WIN32
                   UnmapViewOfFile(data);
                   #else
                   munmap(data, length);
                   #endif
               },
               nullptr
           );

       Local<SharedArrayBuffer> sab = SharedArrayBuffer::New(
           v8::Isolate::GetCurrent(),
           std::move(backing_store)
       );

       fprintf(stderr, "mmap: Successfully mapped %zu bytes at %p\n", size, data);
       info.GetReturnValue().Set(sab);
   }

   NAN_METHOD(NodeMunmap) {
       if (!info[0]->IsSharedArrayBuffer()) {
           return Nan::ThrowTypeError("First argument must be a SharedArrayBuffer");
       }

       Local<SharedArrayBuffer> sab = Local<SharedArrayBuffer>::Cast(info[0]);
       std::shared_ptr<v8::BackingStore> backing_store = sab->GetBackingStore();

       void* data = backing_store->Data();
       size_t length = backing_store->ByteLength();

       if (length == 0 || data == nullptr) {
           return Nan::ThrowError("Invalid SharedArrayBuffer - not a memory mapped buffer");
       }

       fprintf(stderr, "munmap: Buffer at %p with size %zu will be unmapped by backing store destructor\n",
               data, length);
   }

   NAN_METHOD(ExtractString) {
       if (!info[0]->IsSharedArrayBuffer()) {
           return Nan::ThrowTypeError("First argument must be a SharedArrayBuffer");
       }

       Local<SharedArrayBuffer> sab = Local<SharedArrayBuffer>::Cast(info[0]);
       std::shared_ptr<v8::BackingStore> backing_store = sab->GetBackingStore();

       char* data = static_cast<char*>(backing_store->Data());
       size_t length = backing_store->ByteLength();

       // Find actual string length (until first null byte or end)
       size_t str_length = 0;
       while (str_length < length && data[str_length] != '\0') {
           str_length++;
       }

       info.GetReturnValue().Set(
           Nan::New<String>(data, str_length).ToLocalChecked()
       );
   }

   NAN_METHOD(PutStringAtPosition) {
       if (!info[0]->IsSharedArrayBuffer()) {
           return Nan::ThrowTypeError("First argument must be a SharedArrayBuffer");
       }
       if (!info[1]->IsString()) {
           return Nan::ThrowTypeError("Second argument must be a string");
       }

       size_t position = 0;
       if (info.Length() > 2 && info[2]->IsNumber()) {
           position = info[2]->NumberValue(Nan::GetCurrentContext()).FromJust();
       }

       Local<SharedArrayBuffer> sab = Local<SharedArrayBuffer>::Cast(info[0]);
       Nan::Utf8String str(info[1]);

       std::shared_ptr<v8::BackingStore> backing_store = sab->GetBackingStore();
       char* data = static_cast<char*>(backing_store->Data());
       size_t length = backing_store->ByteLength();

       if (position >= length) {
           return Nan::ThrowError("Position is out of bounds");
       }

       size_t str_length = strlen(*str);
       if (position + str_length >= length) {
           return Nan::ThrowError("String is too long for the remaining buffer space");
       }

       // Zero out the region and write the string
       memset(data + position, 0, str_length + 1);
       memcpy(data + position, *str, str_length);
       data[position + str_length] = '\0';
   }

   NAN_METHOD(PutByteAtPosition) {
        if (!info[0]->IsSharedArrayBuffer()) {
            return Nan::ThrowTypeError("First argument must be a SharedArrayBuffer");
        }
        if (!info[1]->IsNumber()) {
            return Nan::ThrowTypeError("Second argument must be a number (byte)");
        }

        double byteValue = info[1]->NumberValue(Nan::GetCurrentContext()).FromJust();
        if (byteValue < 0 || byteValue > 255) {
            return Nan::ThrowError("Byte value must be between 0 and 255");
        }

        uint8_t byte = static_cast<uint8_t>(byteValue);
        size_t position = 0;
        if (info.Length() > 2 && info[2]->IsNumber()) {
            position = info[2]->NumberValue(Nan::GetCurrentContext()).FromJust();
        }
       Local<SharedArrayBuffer> sab = Local<SharedArrayBuffer>::Cast(info[0]);
       std::shared_ptr<v8::BackingStore> backing_store = sab->GetBackingStore();
       uint8_t* data = static_cast<uint8_t*>(backing_store->Data());
       size_t length = backing_store->ByteLength();

       if (position >= length) {
           return Nan::ThrowError("Position is out of bounds");
       }

       data[position] = byte;
   }

   NAN_METHOD(PutBufferAtPosition) {
       if (!info[0]->IsSharedArrayBuffer()) {
           return Nan::ThrowTypeError("First argument must be a SharedArrayBuffer");
       }
       if (!node::Buffer::HasInstance(info[1])) {
           return Nan::ThrowTypeError("Second argument must be a Buffer");
       }

       size_t position = 0;
       if (info.Length() > 2 && info[2]->IsNumber()) {
           position = info[2]->NumberValue(Nan::GetCurrentContext()).FromJust();
       }

       Local<SharedArrayBuffer> sab = Local<SharedArrayBuffer>::Cast(info[0]);
       char* src_data = node::Buffer::Data(info[1]);
       size_t src_length = node::Buffer::Length(info[1]);

       std::shared_ptr<v8::BackingStore> backing_store = sab->GetBackingStore();
       char* dest_data = static_cast<char*>(backing_store->Data());
       size_t dest_length = backing_store->ByteLength();

       if (position >= dest_length) {
           return Nan::ThrowError("Position is out of bounds");
       }
       if (position + src_length > dest_length) {
           return Nan::ThrowError("Source buffer is too large for the remaining space");
       }

       memcpy(dest_data + position, src_data, src_length);
   }

NAN_MODULE_INIT(Init) {
    Nan::Set(target,
        Nan::New<v8::String>("map").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(NodeMmap)).ToLocalChecked()
    );

    Nan::Set(target,
        Nan::New<v8::String>("unmap").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(NodeMunmap)).ToLocalChecked()
    );

    Nan::Set(target,
        Nan::New<String>("extractString").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(ExtractString)).ToLocalChecked()
    );

    Nan::Set(target,
        Nan::New<String>("putStringAtPosition").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(PutStringAtPosition)).ToLocalChecked()
    );

    Nan::Set(target,
        Nan::New<String>("putByteAtPosition").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(PutByteAtPosition)).ToLocalChecked()
    );

     Nan::Set(target,
            Nan::New<String>("putBufferAtPosition").ToLocalChecked(),
            Nan::GetFunction(Nan::New<FunctionTemplate>(PutBufferAtPosition)).ToLocalChecked()
     );

    Nan::Set(target,
        Nan::New<v8::String>("PROT_READ").ToLocalChecked(),
        Nan::New<Number>(PROT_READ)
    );
    Nan::Set(target,
        Nan::New<v8::String>("PROT_WRITE").ToLocalChecked(),
        Nan::New<Number>(PROT_WRITE)
    );
    Nan::Set(target,
        Nan::New<v8::String>("PROT_EXEC").ToLocalChecked(),
        Nan::New<Number>(PROT_EXEC)
    );
    Nan::Set(target,
        Nan::New<v8::String>("PROT_NONE").ToLocalChecked(),
        Nan::New<Number>(PROT_NONE)
    );
    Nan::Set(target,
        Nan::New<v8::String>("MAP_SHARED").ToLocalChecked(),
        Nan::New<Number>(MAP_SHARED)
    );
    Nan::Set(target,
        Nan::New<v8::String>("MAP_PRIVATE").ToLocalChecked(),
        Nan::New<Number>(MAP_PRIVATE)
    );
}

NODE_MODULE(mmap, Init)
