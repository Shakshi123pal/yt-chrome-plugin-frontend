document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");

  // ✔ YOUR API KEY HERE
  const API_KEY = "AIzaSyDoY_aDeASgSq7cWGv4CMQ4LX5Fx_hsNNo";

  // ✔ YOUR FASTAPI LOCAL BACKEND URL
  const API_URL = "http://127.0.0.1:5000";

  // Get the current tab's URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      const videoId = match[1];
      outputDiv.innerHTML = `<div class="section-title">YouTube Video ID</div><p>${videoId}</p><p>Fetching comments...</p>`;

      const comments = await fetchComments(videoId);
      if (comments.length === 0) {
        outputDiv.innerHTML += "<p>No comments found.</p>";
        return;
      }

      outputDiv.innerHTML += `<p>Fetched ${comments.length} comments. Performing sentiment analysis...</p>`;
      const predictions = await getSentimentPredictions(comments);

      if (predictions) {
        const sentimentCounts = { "1": 0, "0": 0, "-1": 0 };
        const sentimentData = [];
        const totalSentimentScore = predictions.reduce((sum, item) => sum + parseInt(item.sentiment), 0);

        predictions.forEach((item) => {
          sentimentCounts[item.sentiment]++;
          sentimentData.push({
            timestamp: item.timestamp,
            sentiment: parseInt(item.sentiment)
          });
        });

        const totalComments = comments.length;
        const uniqueCommenters = new Set(comments.map(x => x.authorId)).size;
        const totalWords = comments.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0);
        const avgWordLength = (totalWords / totalComments).toFixed(2);
        const avgSentimentScore = (totalSentimentScore / totalComments).toFixed(2);
        const normalizedSentimentScore = (((parseFloat(avgSentimentScore) + 1) / 2) * 10).toFixed(2);

        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-title">Comment Analysis Summary</div>
            <div class="metrics-container">
              <div class="metric"><div class="metric-title">Total Comments</div><div class="metric-value">${totalComments}</div></div>
              <div class="metric"><div class="metric-title">Unique Commenters</div><div class="metric-value">${uniqueCommenters}</div></div>
              <div class="metric"><div class="metric-title">Avg Length</div><div class="metric-value">${avgWordLength}</div></div>
              <div class="metric"><div class="metric-title">Avg Sentiment</div><div class="metric-value">${normalizedSentimentScore}/10</div></div>
            </div>
          </div>
        `;

        outputDiv.innerHTML += `<div class="section"><div class="section-title">Sentiment Chart</div><div id="chart-container"></div></div>`;
        await fetchAndDisplayChart(sentimentCounts);

        outputDiv.innerHTML += `<div class="section"><div class="section-title">Trend Graph</div><div id="trend-graph-container"></div></div>`;
        await fetchAndDisplayTrendGraph(sentimentData);

        outputDiv.innerHTML += `<div class="section"><div class="section-title">Word Cloud</div><div id="wordcloud-container"></div></div>`;
        await fetchAndDisplayWordCloud(comments.map(c => c.text));

        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-title">Top 25 Comments</div>
            <ul class="comment-list">
              ${predictions.slice(0, 25).map(
                (item, index) => `<li class="comment-item">${index + 1}. ${item.comment}<br><b>Sentiment: ${item.sentiment}</b></li>`
              ).join('')}
            </ul>
          </div>`;
      }
    } else {
      outputDiv.innerHTML = "<p>This is NOT a YouTube video.</p>";
    }
  });

  async function fetchComments(videoId) {
    let comments = [];
    let pageToken = "";
    try {
      while (comments.length < 500) {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`);
        const data = await response.json();

        if (data.items) {
          data.items.forEach(item => {
            comments.push({
              text: item.snippet.topLevelComment.snippet.textOriginal,
              timestamp: item.snippet.topLevelComment.snippet.publishedAt,
              authorId: item.snippet.topLevelComment.snippet.authorChannelId?.value || "Unknown"
            });
          });
        }

        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    }
    return comments;
  }

  async function getSentimentPredictions(comments) {
    try {
      const response = await fetch(`${API_URL}/predict_with_timestamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments })
      });

      const result = await response.json();
      return response.ok ? result : null;

    } catch (e) {
      console.error("Prediction error:", e);
      return null;
    }
  }

  async function fetchAndDisplayChart(sentimentCounts) {
    const res = await fetch(`${API_URL}/generate_chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentiment_counts: sentimentCounts })
    });
    const blob = await res.blob();
    const imgURL = URL.createObjectURL(blob);

    const img = document.createElement("img");
    img.src = imgURL;
    document.getElementById("chart-container").appendChild(img);
  }

  async function fetchAndDisplayWordCloud(comments) {
    const res = await fetch(`${API_URL}/generate_wordcloud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments })
    });
    const blob = await res.blob();
    const imgURL = URL.createObjectURL(blob);

    const img = document.createElement("img");
    img.src = imgURL;
    document.getElementById("wordcloud-container").appendChild(img);
  }

  async function fetchAndDisplayTrendGraph(sentimentData) {
    const res = await fetch(`${API_URL}/generate_trend_graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentiment_data: sentimentData })
    });
    const blob = await res.blob();
    const imgURL = URL.createObjectURL(blob);

    const img = document.createElement("img");
    img.src = imgURL;
    document.getElementById("trend-graph-container").appendChild(img);
  }
});
