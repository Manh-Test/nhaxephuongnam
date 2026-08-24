const router = require("express").Router();
const Transaction = require("../models/transactionsModel");
const authMiddleware = require("../middlewares/authMiddleware");

// ── Get all transactions with filters & stats (Admin) ──────────────────────
router.post("/get-all-transactions", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find(req.body);

    // Calculate summary statistics
    let totalRevenue = 0;
    let totalTransactions = transactions.length;
    let successfulCount = 0;
    let refundedCount = 0;

    transactions.forEach((t) => {
      if (t.status === "Success") {
        totalRevenue += t.amount;
        successfulCount++;
      } else if (t.status === "Refunded") {
        refundedCount++;
      }
    });

    return res.status(200).send({
      success: true,
      message: "Lấy nhật ký giao dịch thành công",
      data: {
        transactions,
        summary: {
          totalRevenue,
          totalTransactions,
          successfulCount,
          refundedCount,
        },
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
