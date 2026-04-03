# ai-bridge

Capa intermedia entre el usuario y múltiples proveedores de inteligencia artificial, integrada directamente en el navegador.

## Arquitectura

```
extension/       Extensión Chromium (Manifest V3) — interfaz de usuario
native-host/     Programa nativo (Rust) — orquestador de APIs de IA
shared/          Esquema de protocolo entre extensión y native host
```

## Componentes

**Extensión:** Override de New Tab con barra de consulta, keyword `ai` en omnibox, side panel para respuestas largas. Comunicación con el native host vía Chrome Native Messaging.

**Native Host:** Binario Rust que recibe consultas desde la extensión, las enruta al proveedor de IA configurado, y devuelve la respuesta. Soporta múltiples proveedores mediante una interfaz común (trait).

## Requisitos de desarrollo

- Rust >= 1.75 (native host)
- Node.js >= 18 (tooling de extensión, opcional)
- Navegador basado en Chromium (Chrome, Brave, Edge)
- Linux (Arch) o Windows 10+

## Setup

```bash
# Clonar
git clone https://github.com/<tu-usuario>/ai-bridge.git
cd ai-bridge

# Compilar native host
cd native-host
cargo build --release

# Registrar native host en el navegador
./scripts/install-linux.sh   # Linux
# o
scripts\install-windows.bat  # Windows

# Cargar extensión en modo desarrollador
# chrome://extensions -> Activar modo desarrollador -> Cargar descomprimida -> seleccionar carpeta extension/
```

## Proveedores de IA soportados

- [x] Google Gemini (tier gratuito)
- [ ] Ollama (modelos locales)
- [ ] OpenAI
- [ ] Anthropic

## Licencia

MIT
