{
    "targets": [{
        "target_name": "mmap_io",
        "module_name": "mmap_io",
        "sources": [ "src/mmap-io.cc" ],
        "include_dirs": [
            '<!(node -p "require(\'node-addon-api\').include_dir")'
        ],
        "defines": [
            "NODE_GYP_V11",
            "NAPI_VERSION=7",
            "NAPI_CPP_EXCEPTIONS"
        ],
        "cflags_cc": [
            "-std=c++17",
            "-fexceptions"
        ],
        "conditions": [
            ['OS=="mac"', {
                "xcode_settings": {
                    "CLANG_CXX_LIBRARY": "libc++",
                    "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
                    "MACOSX_DEPLOYMENT_TARGET": "11.0",
                    "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                    "OTHER_CPLUSPLUSFLAGS": [
                        "-std=c++17",
                        "-stdlib=libc++",
                        "-fexceptions"
                    ],
                    "OTHER_LDFLAGS": ["-stdlib=libc++"]
                }
            }],
            ['OS=="win"', {
                "sources": ["src/mman.h"],
                "msvs_settings": {
                    "VCCLCompilerTool": {
                        "ExceptionHandling": 1,
                        "AdditionalOptions": ["/std:c++17", "/EHsc"]
                    }
                },
                "defines": [
                    "WIN32",
                    "_HAS_EXCEPTIONS=1"
                ]
            }]
        ]
    }, {
        "target_name": "action_after_build",
        "module_name": "mmap_io",
        "type": "none",
        "dependencies": ["mmap_io"],
        "copies": [{
            "files": ["<(PRODUCT_DIR)/mmap_io.node"],
            "destination": "real"
        }]
    }]
}