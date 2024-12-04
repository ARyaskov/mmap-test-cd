{
    "targets": [{
        "target_name": "mmap_io",
        "sources": [ "src/mmap-io.cc" ],
        "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")"
        ],
        "cflags_cc": [
            "-std=c++17"
        ],
        "defines": [
            "NAPI_VERSION=7",
            "NAPI_CPP_EXCEPTIONS"
        ],
        "conditions": [
            [ 'OS=="mac"',
                { "xcode_settings": {
                    'OTHER_CPLUSPLUSFLAGS' : ['-std=c++17','-stdlib=libc++'],
                    'OTHER_LDFLAGS': ['-stdlib=libc++'],
                    'MACOSX_DEPLOYMENT_TARGET': '11', # macOS Big Sur
                    'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
                }}
            ],
            ['OS=="win"', {
                "sources": [
                    "src/mman.h"
                ],
                "msvs_settings": {
                    "VCCLCompilerTool": {
                        "ExceptionHandling": 1
                    }
                }
            }]
        ]
    },
    {
        "target_name": "action_after_build",
        "type": "none",
        "dependencies": [ "<(module_name)" ],
        "copies": [
            {
                "files": [ "<(PRODUCT_DIR)/<(module_name).node" ],
                "destination": "<(module_path)"
            }
        ]
    }]
}
