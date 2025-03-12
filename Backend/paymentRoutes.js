const express = require("express");
const router = express.Router();
const pool = require("./database");

router.get("/check-payment/:walletAddress", async (req, res) => {
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

module.exports = router;
