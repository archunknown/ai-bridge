# AI Bridge

> Extensión de navegador que conecta al usuario con múltiples proveedores de inteligencia artificial directamente desde la barra de direcciones — sin abrir apps, sin cambiar de pestaña.

---

## Qué hace

**Consulta rápida por omnibox** — Escribe `ai` + Espacio + tu pregunta en la barra de direcciones. La respuesta aparece en las sugerencias sin navegar a ningún sitio.

**Análisis de pantalla** — Presiona un atajo de teclado y la IA analiza lo que estás viendo. Escribe `ai ver` para leer el resultado.

**New Tab inteligente** — Cada nueva pestaña incluye una barra de consulta directa a la IA con respuestas renderizadas en pantalla.

---

## Arquitectura

```
ai-bridge/
├── extension/                  # Extensión Chromium — Manifest V3
│   ├── background/             # Service worker: omnibox, captura, router de mensajes
│   ├── newtab/                 # Override de nueva pestaña con barra de consulta
│   ├── sidepanel/              # Panel lateral para respuestas desde omnibox
│   ├── options/                # Configuración de API keys y proveedor
│   └── icons/                  # Iconos de la extensión
│
├── native-host/                # Programa nativo (Rust) — en desarrollo
│   ├── src/
│   │   ├── main.rs             # Entry point: protocolo Native Messaging (stdin/stdout)
│   │   └── providers/          # Módulos de IA con trait común
│   └── scripts/                # Instaladores por plataforma
│
└── shared/
    └── protocol.json           # Esquema JSON del protocolo extensión ↔ native host
```

**Estado actual:** la extensión llama directamente a la API de Gemini desde el service worker. El native host (Rust) está estructurado pero aún no se interpone como capa intermedia. Es la siguiente fase de desarrollo.

---

## Funcionalidades

| Función | Estado | Descripción |
|---|---|---|
| Consulta por omnibox | Funcional | `ai` + Espacio + pregunta → respuesta en sugerencias |
| Captura de pantalla | Funcional | Atajo de teclado → análisis visual con IA |
| New Tab override | Funcional | Barra de consulta con respuesta renderizada |
| Side panel | Parcial | Limitado por restricción de Brave (`sidePanel.open` requiere gesto) |
| Configuración de API keys | Funcional | Página de opciones para gestionar proveedores |
| Native host (Rust) | Pendiente | Estructura lista, falta integración con la extensión |
| Múltiples proveedores | Pendiente | Solo Gemini por ahora |

---

## Guía para colaboradores

### Requisitos previos

**Ambas plataformas:**

- Git
- Navegador basado en Chromium (Brave, Chrome o Edge)
- Una API key de Google Gemini — gratuita en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**Para desarrollo del native host (opcional por ahora):**

- Rust >= 1.75 — instalar desde [rustup.rs](https://rustup.rs)

---

### Setup en Linux

```bash
# 1. Clonar el repositorio
git clone https://github.com/archunknown/ai-bridge.git
cd ai-bridge

# 2. (Opcional) Compilar el native host
cd native-host
cargo build --release
cd ..

# 3. (Opcional) Registrar el native host en el navegador
chmod +x native-host/scripts/install-linux.sh
./native-host/scripts/install-linux.sh
```

**Cargar la extensión en el navegador:**

1. Abre `brave://extensions` (o `chrome://extensions`).
2. Activa **Modo Desarrollador** (esquina superior derecha).
3. Haz clic en **Cargar descomprimida**.
4. Selecciona la carpeta `extension/` dentro del repositorio clonado.

**Configurar el atajo de captura:**

1. Ve a `brave://extensions/shortcuts` (o `chrome://extensions/shortcuts`).
2. Busca **AI Bridge → Capturar pantalla y analizar con IA**.
3. Asigna un atajo libre (recomendado: `Alt+S`).

**Configurar la API key:**

1. Haz clic derecho en el icono de AI Bridge en la barra del navegador → **Opciones**.
2. Pega tu API key de Gemini.
3. Haz clic en **Guardar**.

---

### Setup en Windows

```powershell
# 1. Clonar el repositorio
git clone https://github.com/archunknown/ai-bridge.git
cd ai-bridge

# 2. (Opcional) Compilar el native host
cd native-host
cargo build --release
cd ..

# 3. (Opcional) Registrar el native host en el navegador
native-host\scripts\install-windows.bat
```

**Cargar la extensión en el navegador:**

1. Abre `brave://extensions` (o `chrome://extensions`).
2. Activa **Modo Desarrollador** (esquina superior derecha).
3. Haz clic en **Cargar descomprimida**.
4. Selecciona la carpeta `extension\` dentro del repositorio clonado.

**Configurar atajo y API key:** mismo procedimiento que en Linux (ver arriba).

---

### Probar que funciona

**Test 1 — Consulta por omnibox:**

1. Haz clic en la barra de direcciones.
2. Escribe `ai` y presiona Espacio. Debe aparecer la etiqueta "AI Bridge |".
3. Escribe una pregunta (ej: `capital de peru`) y espera 2-3 segundos sin presionar Enter.
4. La respuesta aparece en las sugerencias del dropdown.

**Test 2 — Captura de pantalla:**

1. Navega a cualquier página con contenido visible.
2. Presiona tu atajo configurado (ej: `Alt+S`).
3. Espera a que el badge del icono cambie de "..." a "OK".
4. Escribe en la barra: `ai` + Espacio + `ver`.
5. El análisis de la página aparece en las sugerencias.

**Test 3 — New Tab:**

1. Abre una nueva pestaña (`Ctrl+T`).
2. Escribe una pregunta en la barra central y presiona Enter.
3. La respuesta aparece debajo de la barra.

---

### Estructura de desarrollo

Al modificar archivos de la extensión, recarga en `brave://extensions` (botón de flecha circular) para que los cambios tomen efecto.

Los logs del service worker se ven haciendo clic en el enlace **"service worker"** que aparece en la tarjeta de la extensión en `brave://extensions`.

---

## Proveedores de IA

| Proveedor | Estado | Tier gratuito | Notas |
|---|---|---|---|
| Google Gemini | Implementado | Sí (con límites) | Modelo actual: `gemini-2.5-flash` |
| Ollama | Planificado | Sí (local) | Sin costo de API, requiere hardware local |
| OpenAI | Planificado | No | Requiere API key de pago |
| Anthropic | Planificado | No | Requiere API key de pago |

---

## Notas sobre el free tier de Gemini

El tier gratuito de Gemini tiene límites diarios por proyecto (RPD). Si recibes errores 429 con `limit: 0` o `limit: 20`, agotaste la cuota del día. Se reinicia a medianoche hora del Pacífico (2:00 AM Perú, 5:00 AM UTC).

Para desarrollo intensivo, crea proyectos adicionales en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — cada proyecto tiene cuota independiente.

Los modelos `gemini-2.0-*` fueron retirados en marzo 2026. Usa `gemini-2.5-flash` o `gemini-2.5-flash-lite`.

---

## Licencia

[MIT](LICENSE)
