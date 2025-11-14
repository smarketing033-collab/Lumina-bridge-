import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 TwelveData REST Proxies
app.get("/api/history", async (req, res) => {
  try {
    const { symbol, interval, outputsize } = req.query;

    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${process.env.TWELVE_API}&outputsize=${outputsize}`;

    const response = await axios.get(url);
    res.json(response.data);

  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/price", async (req, res) => {
  try {
    const { symbol } = req.query;

    const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${process.env.TWELVE_API}`;
    const response = await axios.get(url);

    res.json(response.data);

  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Server start
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Lumina Secure Bridge Running on Port", port);
});
