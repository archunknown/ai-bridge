const providerSelect = document.getElementById("provider");
const keyGemini = document.getElementById("key-gemini");
const keyOpenai = document.getElementById("key-openai");
const keyAnthropic = document.getElementById("key-anthropic");
const urlOllama = document.getElementById("url-ollama");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

// Load saved config
chrome.runtime.sendMessage({ type: "get_config" }, (config) => {
  if (config?.provider) providerSelect.value = config.provider;
  if (config?.apiKeys) {
    keyGemini.value = config.apiKeys.gemini || "";
    keyOpenai.value = config.apiKeys.openai || "";
    keyAnthropic.value = config.apiKeys.anthropic || "";
    urlOllama.value = config.apiKeys.ollama_url || "http://localhost:11434";
  }
});

saveBtn.addEventListener("click", () => {
  const payload = {
    type: "save_config",
    provider: providerSelect.value,
    apiKeys: {
      gemini: keyGemini.value.trim(),
      openai: keyOpenai.value.trim(),
      anthropic: keyAnthropic.value.trim(),
      ollama_url: urlOllama.value.trim(),
    },
  };

  chrome.runtime.sendMessage(payload, (res) => {
    if (res?.success) {
      statusEl.textContent = "Guardado.";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    }
  });
});
