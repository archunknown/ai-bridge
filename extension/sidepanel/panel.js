const responseEl = document.getElementById("response");
const emptyEl = document.getElementById("empty");

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ai_response") {
    emptyEl.style.display = "none";
    responseEl.textContent = message.data?.text || JSON.stringify(message.data);
  }
});
