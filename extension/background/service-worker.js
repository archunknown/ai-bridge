const NATIVE_HOST_NAME = "com.aibridge.host";

// --- Native Messaging ---

function sendToNativeHost(message) {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    let responded = false;

    port.onMessage.addListener((response) => {
      responded = true;
      resolve(response);
      port.disconnect();
    });

    port.onDisconnect.addListener(() => {
      if (!responded) {
        const error = chrome.runtime.lastError?.message || "Native host disconnected";
        reject(new Error(error));
      }
    });

    port.postMessage(message);
  });
}

// --- Omnibox ---

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  try {
    const response = await sendToNativeHost({
      type: "query",
      prompt: text,
    });

    // Abrir side panel con la respuesta
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });

    // Enviar respuesta al side panel
    chrome.runtime.sendMessage({
      type: "ai_response",
      data: response,
    });
  } catch (err) {
    console.error("[ai-bridge] Error:", err.message);
  }
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (text.length > 2) {
    suggest([
      { content: text, description: `Consultar IA: <match>${text}</match>` },
    ]);
  }
});

// --- Message router (from newtab, sidepanel, options) ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "query") {
    sendToNativeHost({
      type: "query",
      prompt: message.prompt,
      provider: message.provider || null,
    })
      .then((response) => sendResponse({ success: true, data: response }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // async sendResponse
  }

  if (message.type === "get_config") {
    chrome.storage.local.get(["provider", "apiKeys"], (result) => {
      sendResponse({
        provider: result.provider || "gemini",
        apiKeys: result.apiKeys || {},
      });
    });
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
