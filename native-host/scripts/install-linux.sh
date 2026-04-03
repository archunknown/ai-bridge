#!/usr/bin/env bash
set -euo pipefail

HOST_NAME="com.aibridge.host"
BINARY_NAME="ai-bridge-host"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_DIR="$(dirname "$SCRIPT_DIR")"
BINARY_PATH="${HOST_DIR}/target/release/${BINARY_NAME}"

if [[ ! -f "$BINARY_PATH" ]]; then
    echo "Error: Binary not found at $BINARY_PATH"
    echo "Run 'cargo build --release' in native-host/ first."
    exit 1
fi

# Detectar navegadores instalados y registrar en cada uno
REGISTERED=0

register_host() {
    local target_dir="$1"
    local browser_name="$2"

    mkdir -p "$target_dir"
    cat > "${target_dir}/${HOST_NAME}.json" <<EOF
{
  "name": "${HOST_NAME}",
  "description": "AI Bridge native messaging host",
  "path": "${BINARY_PATH}",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://EXTENSION_ID_PLACEHOLDER/"
  ]
}
EOF
    echo "Registered for ${browser_name}: ${target_dir}/${HOST_NAME}.json"
    REGISTERED=$((REGISTERED + 1))
}

# Chrome
CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
[[ -d "$HOME/.config/google-chrome" ]] && register_host "$CHROME_DIR" "Chrome"

# Brave
BRAVE_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
[[ -d "$HOME/.config/BraveSoftware/Brave-Browser" ]] && register_host "$BRAVE_DIR" "Brave"

# Chromium
CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
[[ -d "$HOME/.config/chromium" ]] && register_host "$CHROMIUM_DIR" "Chromium"

# Crear directorio de configuración
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/ai-bridge"
mkdir -p "$CONFIG_DIR"

if [[ ! -f "$CONFIG_DIR/config.toml" ]]; then
    cat > "$CONFIG_DIR/config.toml" <<EOF
default_provider = "gemini"
gemini_api_key = ""
openai_api_key = ""
anthropic_api_key = ""
ollama_url = "http://localhost:11434"
EOF
    echo "Created config: $CONFIG_DIR/config.toml"
fi

if [[ $REGISTERED -eq 0 ]]; then
    echo "Warning: No supported Chromium browser detected."
else
    echo "Done. Registered for $REGISTERED browser(s)."
    echo ""
    echo "IMPORTANT: Replace EXTENSION_ID_PLACEHOLDER in the manifest(s) with your actual extension ID."
    echo "Find it at chrome://extensions after loading the extension."
fi
