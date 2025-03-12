require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// API Route to Check Payment Status
app.get("/api/payment/check-payment/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const result = await pool.query(
      "SELECT * FROM payments WHERE wallet_address = $1 AND status = 'confirmed'",
      [walletAddress]
    );

    if (result.rows.length > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (error) {
    console.error("Error checking payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Seed Phrase Generator
const words = [
  "apple", "banana", "crypto", "ledger", "wallet", "secure", "trust",
  "blockchain", "digital", "future", "token", "bitcoin"
];

app.get("/api/seedphrase/:length", (req, res) => {
  const length = parseInt(req.params.length);
  if (![12, 18, 24].includes(length)) {
    return res.status(400).json({ error: "Invalid seed phrase length" });
  }

  let seedPhrase = [];
  for (let i = 0; i < length; i++) {
    seedPhrase.push(words[Math.floor(Math.random() * words.length)]);
  }

  res.json({ seedPhrase: seedPhrase.join(" ") });
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
