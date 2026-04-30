#!/bin/bash

# NOT TESTED and AI generated

# --- CONFIG ---
DEF_BROWSER="google-chrome"
DEF_FILE="./index.html"
# --------------

QUERY="${1:-""}"
FILE_PATH="${2:-$DEF_FILE}"
BROWSER="${3:-$DEF_BROWSER}"

# Pfad zu file:/// URL
ABS_PATH=$(readlink -f "$FILE_PATH")
FILE_URL="file://$ABS_PATH"

# URL Encoding via Python
ENCODED_QUERY=$(python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe='=&'))" "$QUERY")

# Chrome Call & Extract
"$BROWSER" --headless --dump-dom "$FILE_URL?api=1&$ENCODED_QUERY" 2>/dev/null | sed -n 's/.*<html>\(.*\)<\/html>.*/\1/p'