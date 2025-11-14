import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// Read API key from Render environment variables
const API_KEY = process.env.TWELVE_API_KEY;

app.get("/api/candles", async (req, res) => {
  const { symbol = "EUR/USD", interval = "1h" } = req.query;

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Server failed", details: err.message });
  }
});

// Render gives PORT automatically
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
