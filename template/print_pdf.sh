#!/bin/bash
# Usage: print_pdf.sh resume.html Nikhil_Swami_Resume.pdf   (run from the output folder or pass full paths)
set -e
IN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT" "file://$IN" 2>/dev/null
test -s "$OUT" && echo "wrote $OUT"
