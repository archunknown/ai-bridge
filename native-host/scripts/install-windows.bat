@echo off
setlocal

set HOST_NAME=com.aibridge.host
set SCRIPT_DIR=%~dp0
set HOST_DIR=%SCRIPT_DIR%..
set BINARY_PATH=%HOST_DIR%\target\release\ai-bridge-host.exe

if not exist "%BINARY_PATH%" (
    echo Error: Binary not found at %BINARY_PATH%
    echo Run 'cargo build --release' in native-host\ first.
    exit /b 1
)

:: Escribir manifiesto JSON
set MANIFEST_DIR=%LOCALAPPDATA%\ai-bridge
if not exist "%MANIFEST_DIR%" mkdir "%MANIFEST_DIR%"

set MANIFEST_PATH=%MANIFEST_DIR%\%HOST_NAME%.json

:: Escapar backslashes para JSON
set BINARY_JSON_PATH=%BINARY_PATH:\=\\%

(
echo {
echo   "name": "%HOST_NAME%",
echo   "description": "AI Bridge native messaging host",
echo   "path": "%BINARY_JSON_PATH%",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://EXTENSION_ID_PLACEHOLDER/"
echo   ]
echo }
) > "%MANIFEST_PATH%"

:: Registrar en Chrome via registro de Windows
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
echo Registered for Chrome.

:: Registrar en Brave
reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
echo Registered for Brave.

:: Crear config si no existe
set CONFIG_DIR=%APPDATA%\ai-bridge
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

if not exist "%CONFIG_DIR%\config.toml" (
    (
    echo default_provider = "gemini"
    echo gemini_api_key = ""
    echo openai_api_key = ""
    echo anthropic_api_key = ""
    echo ollama_url = "http://localhost:11434"
    ) > "%CONFIG_DIR%\config.toml"
    echo Created config: %CONFIG_DIR%\config.toml
)

echo.
echo Done. Replace EXTENSION_ID_PLACEHOLDER in %MANIFEST_PATH% with your actual extension ID.
echo Find it at chrome://extensions after loading the extension.

endlocal
