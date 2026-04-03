// --- Gemini API calls ---

async function queryGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: "Responde siempre en español. Sé conciso y directo. Máximo 2-3 oraciones. " }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
}

async function queryGeminiWithImage(prompt, imageBase64, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: "image/png", data: imageBase64 } },
          { text: prompt },
        ],
      }],
      systemInstruction: {
        parts: [{ text: "Responde siempre en español. Sé conciso y directo. Si hay una o MÁS preguntas de materias universitarias o escolares, responde proporcionando la respuesta directa para CADA UNA de las preguntas visibles sin explicaciones adicionales." }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
}

function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["provider", "apiKeys"], (result) => {
      resolve({
        provider: result.provider || "gemini",
        apiKeys: result.apiKeys || {},
      });
    });
  });
}

// --- Screen capture command ---

chrome.commands.onCommand.addListener(async (command) => {
  console.log("[ai-bridge] Command received:", command);
  if (command !== "capture-screen") return;

  try {
    // Indicar que se está procesando
    chrome.action.setBadgeText({ text: "..." });
    chrome.action.setBadgeBackgroundColor({ color: "#0f3460" });

    // Capturar la pestaña visible
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
      quality: 80,
    });

    // Extraer base64 puro (quitar el prefijo data:image/png;base64,)
    const base64 = dataUrl.split(",")[1];

    const config = await getConfig();
    const apiKey = config.apiKeys.gemini || "";

    const prompt =
      "Analiza la imagen. Si ves preguntas de evaluación, examen o ejercicios, escribe ÚNICAMENTE las respuestas correctas para TODAS Y CADA UNA de las preguntas visibles, separándolas o numerándolas. No incluyas frases como 'La imagen muestra' ni resúmenes. Si no hay ninguna pregunta en absoluto, haz un resumen de la página.";

    const response = await queryGeminiWithImage(prompt, base64, apiKey);

    // Guardar el análisis para mostrarlo en el omnibox
    await chrome.storage.local.set({
      screenAnalysis: {
        text: response,
        url: tab.url,
        timestamp: Date.now(),
      },
    });

    // Badge verde = listo
    chrome.action.setBadgeText({ text: "OK" });
    chrome.action.setBadgeBackgroundColor({ color: "#2a9d4a" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);

  } catch (err) {
    console.error("[ai-bridge] Capture error:", err.message);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#cc3333" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
  }
});

// --- Omnibox: respuesta en sugerencias ---

let debounceTimer = null;

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  clearTimeout(debounceTimer);

  // Si el usuario escribe "ver" o "scan", mostrar el último análisis de pantalla
  const scanKeywords = ["ver", "scan", "captura", "pantalla", "screenshot"];
  const isScanQuery = scanKeywords.some((k) => text.trim().toLowerCase().startsWith(k));

  if (isScanQuery) {
    chrome.storage.local.get("screenAnalysis", (data) => {
      if (data.screenAnalysis) {
        const analysis = data.screenAnalysis.text;
        const clean = analysis
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/\n/g, " ");

        const chunks = [];
        const maxLen = 200;
        for (let i = 0; i < clean.length && chunks.length < 5; i += maxLen) {
          chunks.push(clean.substring(i, i + maxLen));
        }

        chrome.omnibox.setDefaultSuggestion({
          description: chunks[0] || "Sin análisis disponible",
        });

        suggest(
          chunks.slice(1).map((chunk, i) => ({
            content: `scan-result-${i}`,
            description: chunk,
          }))
        );
      } else {
        chrome.omnibox.setDefaultSuggestion({
          description: "No hay análisis. Presiona Ctrl+Shift+S para capturar.",
        });
        suggest([]);
      }
    });
    return;
  }

  if (text.length < 3) {
    suggest([]);
    return;
  }

  chrome.omnibox.setDefaultSuggestion({
    description: "Consultando IA...",
  });

  debounceTimer = setTimeout(async () => {
    try {
      const config = await getConfig();
      const apiKey = config.apiKeys.gemini || "";
      const response = await queryGemini(text, apiKey);

      const clean = response
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, " ");

      const chunks = [];
      const maxLen = 200;
      for (let i = 0; i < clean.length && chunks.length < 5; i += maxLen) {
        chunks.push(clean.substring(i, i + maxLen));
      }

      chrome.omnibox.setDefaultSuggestion({
        description: chunks.length > 0 ? chunks[0] : "Sin respuesta",
      });

      suggest(
        chunks.slice(1).map((chunk, i) => ({
          content: `ai-response-${i}-${text}`,
          description: chunk,
        }))
      );
    } catch (err) {
      chrome.omnibox.setDefaultSuggestion({
        description: `Error: ${err.message.substring(0, 100)}`,
      });
      suggest([]);
    }
  }, 1000);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  if (text.startsWith("ai-response-") || text.startsWith("scan-result-")) return;

  await chrome.storage.local.set({ pendingQuery: text });
  await chrome.tabs.create({ url: "chrome://newtab" });
});

// --- Message router ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "query") {
    (async () => {
      try {
        const config = await getConfig();
        const apiKey = config.apiKeys.gemini || "";
        const text = await queryGemini(message.prompt, apiKey);
        sendResponse({ success: true, data: { text } });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === "get_config") {
    getConfig().then((config) => sendResponse(config));
    return true;
  }

  if (message.type === "save_config") {
    chrome.storage.local.set(
      { provider: message.provider, apiKeys: message.apiKeys },
      () => sendResponse({ success: true })
    );
    return true;
  }
});