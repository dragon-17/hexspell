# Hexspell

A human-readable hexadecimal encoding system for text that creates a good secret language while maintaining readability.

## Overview

Hexspell is a creative take on hexadecimal encoding, inspired by concepts like [hexspeak](https://en.wikipedia.org/wiki/Hexspeak) (e.g., `0xcoffee`, `0xdeadbeef`) but extended to encode all characters. It uses a 4-bit encoding system combined with special combos and escape sequences for complete character coverage.

**Key Benefits:**
- Human-readable hex encoding - easier to work with than binary
- Compact representation - shorter than ASCII when saved as binary
- Bidirectional conversion - encode text to hex and decode hex back to text
- Secret language application - obfuscate text in a playful way

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
- Node.js (optional, for scripting)

### Setup

1. **Web Interface:** Simply open `index.html` in a web browser
   
2. **CLI Setup (Windows):**
   ```
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

**Basic encoding from command line:**
```bash
chrome --headless --dump-dom "file:///path/to/index.html?api&hex=6100cce173d"
```

**Encoding text:**
```bash
chrome --headless --dump-dom "file:///path/to/index.html?api&text=Hello+World" | more
```

**With options:**
```bash
chrome --headless --dump-dom "file:///path/to/index.html?api=1&esc=1&sameNum=1&readableWS=1&compact=1&hex=6100cce17"
```

**Save to file:**
```bash
chrome --headless --dump-dom "file:///path/to/index.html?api&text=Your+Text+Here" > output.txt
```

**Batch files:** Use `hexspell.bat` (Windows) or `hexspell.sh` (Linux/Mac) for convenient CLI access

## Encoding System

- **Base Unit:** 4-bit encoding per character
- **Combos:** Special character combinations for extended coverage
- **Escapes:** Escape sequences for characters outside the basic set
- **Optimization:** Configurable output formats (readable, compact, etc.)

## Examples

The `dump/` folder contains test cases:
- `helloWorld.hex.txt` - Hexspell-encoded "Hello World"
- `star_wars.txt` - Longer text example
- Other test files showing various encodings

## API Query Parameters

- `api` - Enable API mode
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