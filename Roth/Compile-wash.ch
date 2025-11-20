#!/bin/bash
echo "🔨 Kompilerer RoTH til WebAssembly..."

# Ensure emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten ikke funnet. Installer med:"
    echo "   git clone https://github.com/emscripten-core/emsdk.git"
    echo "   cd emsdk && ./emsdk install latest && ./emsdk activate latest"
    exit 1
fi

# Compile RoTH to WASM
emcc roth.c \
    -O3 \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_roth_hash", "_malloc", "_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -o ../js/roth-wasm.js

echo "✅ RoTH WASM kompilert til js/roth-wasm.js"
