document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");
  const API_URL = "http://127.0.0.1:5000";  // LOCAL FASTAPI BACKEND
  const API_KEY = "YOUR_YOUTUBE_API_KEY";  // Replace with your key

  document.getElementById("sendRequest").addEventListener("click", analyzeVideo);

  async function analyzeVideo() {
    outputDiv.innerHTML = "<p>Detecting YouTube video...</p>";

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0].url;

      // FIXED REGEX — now detects ANY YouTube link
      const youtubeRegex = /v=([\w-]{11})/;
      const match = url.match(youtubeRegex);

      if (!match) {
        outputDiv.innerHTML = "<p>This is NOT a YouTube video.</p>";
        return;
      }

      const videoId = match[1];
      outputDiv.innerHTML = `<p>Video ID detected: ${videoId}</p>`;

      const comments = await fetchComments(videoId);

      if (comments.length === 0) {
        outputDiv.innerHTML += "<p>No comments found.</p>";
        return;
      }

      outputDiv.innerHTML += `<p>Fetched ${comments.length} comments. Analyzing...</p>`;

      const predictions = await getSentimentPredictions(comments);

      outputDiv.innerHTML += `<pre>${JSON.stringify(predictions.slice(0,5), null, 2)}</pre>`;
    });
  }

  // --- FETCH COMMENTS FROM YOUTUBE API ---
  async function fetchComments(videoId) {
    let comments = [];
    let pageToken = "";

    try {
      while (comments.length < 200) {
        const url =
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}` +
          `&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.items) {
          data.items.forEach((item) => {
            comments.push({
              text: item.snippet.topLevelComment.snippet.textOriginal,
              timestamp: item.snippet.topLevelComment.snippet.publishedAt,
            });
          });
        }

        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    } catch (err) {
      console.error(err);
    }

    return comments;
  }

  // ---- SEND COMMENTS TO FASTAPI BACKEND ----
  async function getSentimentPredictions(comments) {
    try {
      const response = await fetch(`${API_URL}/predict_with_timestamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });

      return await response.json();
    } catch (error) {
      console.error("Prediction error:", error);
      return null;
    }
  }
});
