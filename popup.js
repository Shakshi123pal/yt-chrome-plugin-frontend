document.addEventListener("DOMContentLoaded", () => {
  const outputDiv = document.getElementById("output");
  const analyzeBtn = document.getElementById("sendRequest");

  const API_URL = "http://127.0.0.1:8000";

  analyzeBtn.addEventListener("click", () => {
    outputDiv.innerHTML = "Checking YouTube video...";

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0].url;
      const match = url.match(/v=([a-zA-Z0-9_-]{11})/);

      if (!match) {
        outputDiv.innerHTML = " Not a valid YouTube video.";
        return;
      }

      const videoId = match[1];
      outputDiv.innerHTML = ` Video ID: ${videoId}<br>📥 Analyzing comments...`;

      try {
        const res = await fetch(`${API_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_id: videoId })
        });

        const result = await res.json();

        renderResults(result.summary);

      } catch (e) {
        console.error(e);
        outputDiv.innerHTML = " Analysis failed.";
      }
    });
  });

  function renderResults(summary) {
    outputDiv.innerHTML = `
      <b>Sentiment Results</b><br><br>
      Positive: ${summary.positive}<br>
      Neutral: ${summary.neutral}<br>
      Negative: ${summary.negative}
    `;
  }
});
