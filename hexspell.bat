:: use Ex.:
::    hexspell.bat "text=mein hexspell geheim text"
::    hexspell "text=test zorro?&esc=1&sameNum=0" "./other/Js/index.html"
::    hexspell "text=hi zorro" "index.html" "C:\other\Portable\Chrome.exe"
@echo off
setlocal enabledelayedexpansion

:: --- CONFIG ---    v-- mein install path, kann durch bessern auf anderen System ersetzt werden
set "defBrowser=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "defFile=index.html"
:: --------------

set "RAW_QUERY=%~1"
set "FILE_PATH=%~2"
set "BROWSER=%~3"
if "!FILE_PATH!"=="" set "FILE_PATH=%defFile%"
if "!BROWSER!"=="" set "BROWSER=%defBrowser%"

:: Absoluter Pfad & file:/// Konvertierung
set "FULL_PATH=%~f2"
if "!FULL_PATH!"=="" for %%i in ("%FILE_PATH%") do set "FULL_PATH=%%~fi"
set "FILE_URL=file:///!FULL_PATH:\=/!"

:: URL Encoding via PowerShell (damit "wer bin ich" zu "wer%20bin%20ich" wird)
for /f "delims=" %%i in ('powershell -Command "[uri]::EscapeUriString('!RAW_QUERY!')"') do set "ENCODED_QUERY=%%i"

:: Chrome Call & Extract
for /f "tokens=2 delims=<>" %%A in ('^""%BROWSER%" --headless --dump-dom "!FILE_URL!?api=1&!ENCODED_QUERY!" 2^>nul ^| findstr "<html>"^') do (
    echo %%A
)