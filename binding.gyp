{
    "variables": {
        "module_path": "<(module_root_dir)/build/binding/Release/<(target_arch)-<(OS)/",
        "module_name": "mmap_io"
    },
    "targets": [
        {
            "target_name": "mmap_io",
            "sources": ["src/native/mmap-io.cc"],
            "include_dirs": [
                "<!(node -e \"require('nan')\")"
            ],
            "cflags!": ["-fno-exceptions"],
            "cflags_cc!": ["-fno-exceptions"],
            "conditions": [
                ['OS=="win"', {
                    "defines": [
                        "_WIN32"
                    ],
                    "msvs_settings": {
                        "VCCLCompilerTool": {
                            "ExceptionHandling": 1,
                            "AdditionalOptions": ["/MP"]
                        }
                    }
                }],
                ['OS!="win"', {
                    "cflags+": ["-fexceptions"],
                    "cflags_cc+": ["-fexceptions"]
                }]
            ],
            "xcode_settings": {
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "CLANG_CXX_LIBRARY": "libc++",
                "MACOSX_DEPLOYMENT_TARGET": "10.15"
            }
        },
        {
            "target_name": "action_after_build",
            "type": "none",
            "dependencies": ["mmap_io"],
            "copies": [
                {
                    "files": ["<(PRODUCT_DIR)/mmap_io.node"],
                    "destination": "<(module_path)"
                }
            ]
        }
    ]
}