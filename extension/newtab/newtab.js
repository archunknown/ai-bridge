const input = document.getElementById("prompt-input");
const responseEl = document.getElementById("response");
const loadingEl = document.getElementById("loading");
const providerBadge = document.getElementById("provider-badge");

// Load current provider name
chrome.runtime.sendMessage({ type: "get_config" }, (config) => {
  if (config?.provider) {
    providerBadge.textContent = config.provider;
  }
});

input.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter" || !input.value.trim()) return;

  const prompt = input.value.trim();

  loadingEl.classList.add("visible");
  responseEl.classList.remove("visible");
  responseEl.textContent = "";

  chrome.runtime.sendMessage(
    { type: "query", prompt },
    (result) => {
      loadingEl.classList.remove("visible");

      if (result?.success) {
        responseEl.textContent = result.data?.text || JSON.stringify(result.data);
      } else {
        responseEl.textContent = `Error: ${result?.error || "Sin respuesta"}`;
      }

      responseEl.classList.add("visible");
    }
  );
});
