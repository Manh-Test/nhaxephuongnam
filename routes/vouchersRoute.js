const router = require("express").Router();
const Voucher = require("../models/vouchersModel");
const authMiddleware = require("../middlewares/authMiddleware");

// ── Check / Apply voucher code ─────────────────────────────────────────────
router.post("/apply-voucher", authMiddleware, async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(200).send({
        success: false,
        message: "Vui lòng nhập mã giảm giá.",
      });
    }
    const result = await Voucher.validateVoucher(code, Number(amount) || 0);
    if (!result.valid) {
      return res.status(200).send({
        success: false,
        message: result.message,
      });
    }
    return res.status(200).send({
      success: true,
      message: result.message,
      data: {
        code: result.voucher.code,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Get all vouchers (Admin) ───────────────────────────────────────────────
router.post("/get-all-vouchers", authMiddleware, async (req, res) => {
  try {
    const vouchers = await Voucher.find();
    return res.status(200).send({
      success: true,
      message: "Lấy danh sách mã giảm giá thành công",
      data: vouchers,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Create voucher (Admin) ─────────────────────────────────────────────────
router.post("/add-voucher", authMiddleware, async (req, res) => {
  try {
    const existing = await Voucher.findOne({ code: req.body.code });
    if (existing) {
      return res.status(200).send({
        success: false,
        message: "Mã giảm giá này đã tồn tại trên hệ thống",
      });
    }
    const voucher = await Voucher.create(req.body);
    return res.status(200).send({
      success: true,
      message: "Thêm mã giảm giá thành công",
      data: voucher,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Update voucher (Admin) ─────────────────────────────────────────────────
router.post("/update-voucher", authMiddleware, async (req, res) => {
  try {
    const targetId = req.body._id || req.body.id;
    await Voucher.findByIdAndUpdate(targetId, req.body);
    return res.status(200).send({
      success: true,
      message: "Cập nhật mã giảm giá thành công",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Delete voucher (Admin) ─────────────────────────────────────────────────
router.post("/delete-voucher", authMiddleware, async (req, res) => {
  try {
    const targetId = req.body._id || req.body.id;
    await Voucher.findByIdAndDelete(targetId);
    return res.status(200).send({
      success: true,
      message: "Xóa mã giảm giá thành công",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
