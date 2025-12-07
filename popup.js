document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");

  // ⭐ Your Local FastAPI Backend
  const API_URL = "http://127.0.0.1:5000";

  // ⭐ Your Existing YouTube Comment API KEY (Fully Works)
  const API_KEY = "AIzaSyDoY_aDeASgSq7cWGv4CMQ4LX5Fx_hsNNo";

  // Get active tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;

    // Extract video ID
    const ytRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(ytRegex);

    if (!match) {
      outputDiv.innerHTML = "<p>This is NOT a YouTube video.</p>";
      return;
    }

    const videoId = match[1];

    outputDiv.innerHTML = `
      <div class="section-title">Video ID:</div>
      <p>${videoId}</p>
      <p>Fetching comments...</p>
    `;

    // Fetch YT comments
    const comments = await fetchComments(videoId);

    if (comments.length === 0) {
      outputDiv.innerHTML += "<p>No comments found.</p>";
      return;
    }

    outputDiv.innerHTML += `<p>Fetched ${comments.length} comments. Analyzing sentiments...</p>`;

    // Get predictions
    const predictions = await getSentimentPredictions(comments);

    if (!predictions) {
      outputDiv.innerHTML += "<p>Error in sentiment analysis.</p>";
      return;
    }

    // -----------------------
    // SENTIMENT SUMMARY
    // -----------------------
    const sentimentCounts = { "0": 0, "1": 0, "2": 0 };
    const sentimentData = [];

    predictions.forEach((item) => {
      sentimentCounts[item.sentiment]++;
      sentimentData.push({
        timestamp: item.timestamp,
        sentiment: parseInt(item.sentiment),
      });
    });

    const totalComments = comments.length;

    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Summary</div>
        <p><b>Total Comments:</b> ${totalComments}</p>
      </div>
    `;

    // PIE CHART
    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Sentiment Chart</div>
        <div id="chart-container"></div>
      </div>
    `;
    await fetchAndDisplayChart(sentimentCounts);

    // WORD CLOUD
    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Word Cloud</div>
        <div id="wordcloud-container"></div>
      </div>
    `;
    await fetchAndDisplayWordCloud(comments.map((c) => c.text));

    // TOP COMMENTS
    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Top 20 Comments</div>
        <ul class="comment-list">
          ${predictions
            .slice(0, 20)
            .map(
              (item, i) => `
                <li class="comment-item">
                ${i + 1}. ${item.comment}<br>
                <span class="comment-sentiment">Sentiment: ${item.sentiment}</span>
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    `;
  });

  // -------------------------
  // Fetch YouTube Comments
  // -------------------------
  async function fetchComments(videoId) {
    let comments = [];
    let nextPage = "";

    try {
      while (comments.length < 300) {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&maxResults=100&videoId=${videoId}&pageToken=${nextPage}&key=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.items) break;

        data.items.forEach((item) => {
          comments.push({
            text: item.snippet.topLevelComment.snippet.textOriginal,
            timestamp: item.snippet.topLevelComment.snippet.publishedAt,
          });
        });

        nextPage = data.nextPageToken;
        if (!nextPage) break;
      }
    } catch (err) {
      console.error("YT Fetch Error:", err);
    }

    return comments;
  }

  // -------------------------
  // Get Sentiment Predictions
  // -------------------------
  async function getSentimentPredictions(comments) {
    try {
      const res = await fetch(`${API_URL}/predict_with_timestamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });

      return await res.json();
    } catch (err) {
      console.error("Prediction Error:", err);
      return null;
    }
  }

  // -------------------------
  // Show Pie Chart
  // -------------------------
  async function fetchAndDisplayChart(sentimentCounts) {
    try {
      const res = await fetch(`${API_URL}/generate_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment_counts: sentimentCounts }),
      });

      const blob = await res.blob();
      const imgURL = URL.createObjectURL(blob);

      const img = document.createElement("img");
      img.src = imgURL;

      document.getElementById("chart-container").appendChild(img);
    } catch (err) {
      console.log("Chart error:", err);
    }
  }

  // -------------------------
  // Show WordCloud
  // -------------------------
  async function fetchAndDisplayWordCloud(comments) {
    try {
      const res = await fetch(`${API_URL}/generate_wordcloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });

      const blob = await res.blob();
      const imgURL = URL.createObjectURL(blob);

      const img = document.createElement("img");
      img.src = imgURL;

      document.getElementById("wordcloud-container").appendChild(img);
    } catch (err) {
      console.log("Wordcloud error:", err);
    }
  }
});
