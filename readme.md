# Hexspell

A human-readable hexadecimal encoding system for text that creates a good secret language while maintaining readability.

Taking a input text you can convert it into a readable hexadecimal stream:

    hello world!
    foobar

    try to read the hexspell, you can do it!

    abra kadabra ta daa!!!

Readable hex output (spaces are only for formating, only hex digit determine the content, the 00 encode message space and 0000 encode new lines):
    
    6 e 12 0 00 cc 0 2 1 d 3E 0000 
    f 88 b a 2 0000 
    0000 
    7 2 9 00 7 0 00 2 e a d 00 7 6 e 00 6 e 3 5 6 e 12 3b 00 90c 00 c a 4 00 d 0 00 1 7 3E 0000 
    0000 a b 2 a 00 b a d a b 2 a 00 7 a 00 d a a 3E 3E 3E

Best you try out the [live demo](https://dragon-17.github.io/hexspell/) or you can use the no install CLI described below.

## Overview

Hexspell is a creative take on hexadecimal encoding, inspired by concepts like [hexspeak](https://en.wikipedia.org/wiki/Hexspeak) (e.g., `0xcoffee`, `0xdeadbeef`) but extended to encode all characters. It uses a 4-bit encoding system combined with special combos and escape sequences for complete character coverage.

**Key Benefits:**
- Human-readable hex encoding - easier to work with than binary
- Compact representation - shorter than ASCII when saved as binary
- Bidirectional conversion - encode text to hex and decode hex back to text
- Secret language application - obfuscate text in a playful way


## Encoding System

### Overview
- **Base Unit:** 4-bit encoding per character (hex digits 0-f)
- **Combos:** Special character combinations for extended coverage
- **Escapes:** Escape sequences (marked with `e5c`) for characters outside the basic set
- **Optimization:** Configurable output formats (readable, compact, etc.)

### Table 1: Basic Hex-to-Character Mapping

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **o** | **l**, (i) | **r**, z | **x** | **n**, m | **s** | **h**, p | **t** | **i** | **g**, y, j, q | **a** | **b**, k | **c**, u, v, w | **d** | **e** | **f** |

Example: 
    
    7615 00  15 00  a 00  5ec2e7 00  44e55a9e 3b  

    This " " is " " a " " secret " "  message ;

    
    
**Mappings Explained:**
- **0** = 'o' (zero looks like o)
- **1** = 'l' or 'i' (1 looks like lowercase l; use 8 for 'i')
- **2** = 'r' or 'z'
- **3** = 'x' (requires escape marker; or use combo 'bf')
- **4** = 'n' or 'm' (use combo 'd4' for double 'n')
- **5** = 's'
- **6** = 'h' or 'p' (use '6b' combo for 'p', '9f' for 'h')
- **7** = 't'
- **8** = 'i' (the dot above the 8 represents 'i')
- **9** = 'g', 'y', 'j', or 'q' (use '9b' combo for 'qu')
- **a** = 'a'
- **b** = 'b' or 'k' (use '74' combo for 'k')
- **c** = 'c', 'u', 'v', or 'w' (use 'cc' combo for 'w')
- **d** = 'd'
- **e** = 'e'
- **f** = 'f' (or 'fb' for alternate)

### Table 2: Special Escape & Combo Sequences

| Combo | Mapping | Notes |
|-------|---------|-------|
| **cc** | w | Double-u (cc = uu, vv rare, low impact) |
| **fd** | v | f='\' and d='/' → \/ (visual mnemonic) |
| **74** | k | 7='\|' and 4='<' → \|< (looks like k) |
| **9b** | qu | - |
| **6b** | p | Better decodability (pb is rare) |
| **9f** | h | Looks like capital H (optional, use hex 6 instead) |
| **9d** | j | gd, jd are rare |
| **97** | y | gt, jt, yt are rare; '7' matches y's stroke |
| **7b** | z | - |
| **bf** | x | - |
| **00** | (space) | Null byte as space |
| **3a** | : | ESC Enumeration |
| **3b** | ;, . , | ESC Break (general delimiter) |
| **3c** | (control) | Beginning of control code (e.g., 3c7 = tab) |
| **3d** | @ | Interpret next byte as ASCII number/char |
| **3e** | ! | 0x3E is ASCII '>' (read as ESC Exclamation) |
| **3f** | ? | ESC Question mark |
| **30-39**|0-9| The number digits, \x3n are the actual ASCII code for numbers
| **3add** | + | ESC Add |
| **35cb**, **bb** | - | ESC Subtract (bb is shorter) |
| **344c** | * | ESC Multiply (mu) |
| **3d1f** | / | ESC Divide |



## Features

### Web Interface
- **Color-coded display** - Visual highlighting for different character types:
  - Space characters (light gray)
  - Escape sequences (orange)
  - Standard hex values (blue)
  - Mathematical operations (magenta/violet)
  - Error states (crimson)

- **Interactive conversion** - Real-time encoding and decoding
- **Bidirectional option** - Handle ambiguous decodings with dropdown selector
- **Format options** - Various display and encoding formats
- **Download functionality** - Export results as both hex and ASCII formats

### Command-Line Interface
- Headless Chrome integration for CLI usage
- Query parameter API for automated encoding/decoding
- Support for file input/output
- URL encoding support


## Installation

### Requirements
- Google Chrome (or Chromium-based browser)
- You can use the github-page of this repo **without** an install.
- Node.js (optional, for scripting)

### Setup

1. **Web Interface:** Simply open `index.html` in a web browser
   
2. **CLI Setup (Windows):**
   ```
   set HEX_API="file:///C:\Users\<YourUser>\path\to\hexspell\index.html"
   
   # or if you don't want to donwload the index.html
   set HEX_API="file:///C:\Users\<YourUser>\path\to\hexspell\index.html"
   ```

3. **CLI Setup (Linux/Mac):**
   ```
   export HEX_API="file:///path/to/hexspell/index.html"
   ```

## Usage

### Web Interface
1. Open `index.html` in your browser
2. Enter text in the input field to convert to hexspell
3. Or paste hexspell code to decode back to text
4. Use the dropdown for ambiguous decoding options
5. Download results as needed

### Command-Line Interface

**Basic encoding to a hexspell from the command line via query paramenter `text`:**
```bash
# windows  use $envVar and | cat on linux
your/path/to/chrome.exe --headless --dump-dom "%HEX_API%?api&text=Hello+World" | more
```

You can add chrome to your path. Makes it easier and allow more option (screenshots, headless browsing, dom-dump).

**Decode a hex spell via the api and query paramenter `hex`:**
```bash
chrome --headless --dump-dom "%HEX_API%?api&hex=6100cce173d" | more
```

**With options:**
```bash
chrome --headless --dump-dom "%HEX_API%?api=1&esc=1&sameNum=1&readableWS=1&compact=1&hex=6100cce17"
```

**Save to file:**
```bash
chrome --headless --dump-dom "%HEX_API%?api&text=Your+Text+Here" > output.txt
```

**Batch files:** Use `hexspell.bat` (Windows) or `hexspell.sh` (Linux/Mac) for convenient CLI access

**Example no install via githubpages (just execute this in a terminal with internet):**
```bash
chrome --headless --dump-dom "https://dragon-17.github.io/hexspell/?api&hex=40cc0090c00ca400c5e0076e006e356e1200a6100f204400efde29cc6e2e3E" | more
```
You can also open this in a browser (but you may need a `keep` parameter to avoid window auto close).
## Examples

The `dump/` folder contains test cases:
- `helloWorld.hex.txt` - Hexspell-encoded "Hello World"
- `star_wars.txt` - Longer text example
- Other test files showing various encodings

## API Query Parameters

- `api` - Enable API mode - the html trims itself to a minimum
- `hex` - Hexspell code to decode
- `text` - Text to encode
- `esc` - Enable escape sequences
- `sameNum` - Keep same number format
- `readableWS` - Make whitespace readable
- `compact` - Compact output format


## Future Ideas

- Custom font for better number display
- Extended character support
- Compression integration
- Visual encoding/decoding tutorial
- Performance optimizations for large texts

## Project Structure

```
hexspell/
├── index.html              # Main web interface
├── hexspell.bat            # Windows batch wrapper
├── hexspell.sh             # Unix shell wrapper
├── CMDL_API_INFO.txt       # CLI usage documentation
├── readme.md               # This file
└── dump/                   # Example encoded texts
```

## License

any Opensource lic

## Inspiration

Inspired by:
- [Hexspeak](https://en.wikipedia.org/wiki/Hexspeak) - Hexadecimal code that looks like words
- Leetspeak - Creative character substitution
- Esoteric programming languages