#include <napi.h>
#include <string>

#ifdef _WIN32
#include <windows.h>
#include "mman.h"
#else
#include <unistd.h>
#include <sys/mman.h>
#endif

using namespace Napi;

Value NodeMmap(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 4) {
        throw Error::New(env, "map() requires 4 args minimum");
    }

    size_t size = info[0].As<Number>().Uint32Value();
    int protection = info[1].As<Number>().Int32Value();
    int flags = info[2].As<Number>().Int32Value();
    int fd = info[3].As<Number>().Int32Value();
    size_t offset = info.Length() > 4 ? info[4].As<Number>().Uint32Value() : 0;

    // Anon mode
    if (fd == -1) {
        flags |= MAP_ANON; // or MAP_ANONYMOUS
    }

    void* data = mmap(nullptr, size, protection, flags, fd, offset);

    if (data == MAP_FAILED) {
        throw Error::New(env, std::string("mmap failed: ") + strerror(errno));
    }

    return Buffer<char>::New(env, static_cast<char*>(data), size).ToObject(); // TODO add munmap here
}

Value NodeAdvise(const CallbackInfo& info) {
    Env env = info.Env();

    if (!info[0].IsBuffer()) {
        throw Error::New(env, "The first argument must be Buffer");
    }

    char* data = info[0].As<Buffer<char>>().Data();
    size_t length = info[0].As<Buffer<char>>().Length();
    int advice = info[1].As<Number>().Int32Value();

    if (madvise(data, length, advice) != 0) {
        throw Error::New(env, std::string("madvise failed: ") + strerror(errno));
    }

    return env.Undefined();
}

Value NodeSync(const CallbackInfo& info) {
    Env env = info.Env();

    if (!info[0].IsBuffer()) {
        throw Error::New(env, "The first argument must be Buffer");
    }

    char* data = info[0].As<Buffer<char>>().Data();
    size_t length = info[0].As<Buffer<char>>().Length();
    int flags = info[1].IsNumber() ? info[1].As<Number>().Int32Value() : MS_SYNC;

    if (msync(data, length, flags) != 0) {
        throw Error::New(env, std::string("msync failed: ") + strerror(errno));
    }

    return env.Undefined();
}

Object Init(Env env, Object exports) {
    exports.Set(String::New(env, "map"),
               Function::New(env, NodeMmap));
    exports.Set(String::New(env, "advise"),
               Function::New(env, NodeAdvise));
    exports.Set(String::New(env, "sync"),
               Function::New(env, NodeSync));

    exports.Set("PROT_READ", Number::New(env, PROT_READ));
    exports.Set("PROT_WRITE", Number::New(env, PROT_WRITE));
    exports.Set("PROT_EXEC", Number::New(env, PROT_EXEC));
    exports.Set("PROT_NONE", Number::New(env, PROT_NONE));

    exports.Set("MAP_SHARED", Number::New(env, MAP_SHARED));
    exports.Set("MAP_PRIVATE", Number::New(env, MAP_PRIVATE));

#ifdef MAP_NONBLOCK
    exports.Set("MAP_NONBLOCK", Number::New(env, MAP_NONBLOCK));
#endif

#ifdef MAP_ANON
    exports.Set("MAP_ANON", Number::New(env, MAP_ANON));
#endif

    exports.Set("MADV_NORMAL", Number::New(env, MADV_NORMAL));
    exports.Set("MADV_RANDOM", Number::New(env, MADV_RANDOM));
    exports.Set("MADV_SEQUENTIAL", Number::New(env, MADV_SEQUENTIAL));
    exports.Set("MADV_WILLNEED", Number::New(env, MADV_WILLNEED));
    exports.Set("MADV_DONTNEED", Number::New(env, MADV_DONTNEED));

#ifdef _WIN32
    SYSTEM_INFO sysinfo;
    GetSystemInfo(&sysinfo);
    exports.Set("PAGESIZE", Number::New(env, sysinfo.dwPageSize));
#else
    exports.Set("PAGESIZE", Number::New(env, sysconf(_SC_PAGESIZE)));
#endif

    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
