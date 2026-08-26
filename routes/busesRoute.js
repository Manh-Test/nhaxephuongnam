const router = require("express").Router();
const Bus = require("../models/busModel");
const Booking = require("../models/bookingsModel");
const SeatLock = require("../models/seatLockModel");
const Transaction = require("../models/transactionsModel");
const User = require("../models/usersModel");
const authMiddleware = require("../middlewares/authMiddleware");



// ── Add bus ────────────────────────────────────────────────────────────────
router.post("/add-bus", authMiddleware, async (req, res) => {
  try {
    if (!req.body.driverId) {
      return res.status(200).send({
        success: false,
        message: "Bắt buộc phải chỉ định Tài xế / Phụ xe phụ trách trước khi tạo chuyến xe!",
      });
    }
    const driver = await User.findById(req.body.driverId);
    if (!driver || driver.role !== "Staff") {
      return res.status(200).send({
        success: false,
        message: "Nhân viên phụ trách không hợp lệ.",
      });
    }
    const existingBus = await Bus.findOne({ number: req.body.number });
    if (existingBus) {
      return res.status(200).send({
        success: false,
        message: "Biển số / Mã chuyến xe đã tồn tại trên hệ thống",
      });
    }
    const bus = await Bus.create(req.body);
    return res.status(200).send({
      success: true,
      message: "Thêm tuyến xe mới thành công",
      data: bus,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Update bus ─────────────────────────────────────────────────────────────
router.post("/update-bus", authMiddleware, async (req, res) => {
  try {
    const busId = req.body._id || req.body.id;
    const existingBus = await Bus.findById(busId);
    if (!existingBus) {
      return res.status(404).send({ success: false, message: "Không tìm thấy chuyến xe" });
    }
    if (existingBus.status && existingBus.status !== "Yet To Start") {
      return res.status(200).send({
        success: false,
        message: `Chuyến xe đã bắt đầu hoạt động (Trạng thái: ${existingBus.status}). Không thể chỉnh sửa lộ trình hoặc nhân viên nữa!`,
      });
    }
    if (!req.body.driverId) {
      return res.status(200).send({
        success: false,
        message: "Bắt buộc phải chỉ định Tài xế / Phụ xe phụ trách chuyến xe!",
      });
    }
    const driver = await User.findById(req.body.driverId);
    if (!driver || driver.role !== "Staff") {
      return res.status(200).send({
        success: false,
        message: "Nhân viên phụ trách không hợp lệ.",
      });
    }
    await Bus.findByIdAndUpdate(busId, req.body);
    return res.status(200).send({
      success: true,
      message: "Cập nhật thông tin chuyến xe thành công",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Delete bus (with active booking check) ──────────────────────────────────
router.post("/delete-bus", authMiddleware, async (req, res) => {
  try {
    const busId = req.body._id || req.body.id;
    const existingBus = await Bus.findById(busId);
    if (!existingBus) {
      return res.status(404).send({ success: false, message: "Không tìm thấy chuyến xe" });
    }
    if (existingBus.status === "Completed") {
      await Bus.findByIdAndUpdate(busId, {
        status: "Archived",
        driverId: null,
        driverName: null,
      });
      return res.status(200).send({
        success: true,
        message: "Đã lưu trữ chuyến xe hoàn thành. Lịch sử đặt vé vẫn được giữ nguyên.",
      });
    }
    if (existingBus && existingBus.status && !["Yet To Start", "Completed"].includes(existingBus.status)) {
      return res.status(200).send({
        success: false,
        message: `Chuyến xe đang hoạt động (${existingBus.status}). Chỉ có thể xóa chuyến chưa chạy hoặc đã hoàn thành!`,
      });
    }
    const bookings = await Booking.findByBusId(busId);
    const activeBookings = bookings.filter((booking) => booking.status !== "Cancelled");
    if (existingBus.status === "Yet To Start" && activeBookings.length > 0) {
      for (const booking of activeBookings) {
        if (booking.status === "Boarded") {
          return res.status(200).send({
            success: false,
            message: "Không thể hủy chuyến vì đã có hành khách lên xe.",
          });
        }

        await Booking.updateStatus(booking.id, "Cancelled");
        await Transaction.create({
          transactionId: `REFUND_BUS_${busId}_${booking.id}`,
          bookingId: booking.id,
          userId: booking.user.id,
          amount: -booking.totalAmount,
          paymentMethod: "Refund",
          status: "Refunded",
        });
      }

      await Bus.findByIdAndUpdate(busId, { status: "Cancelled" });
      return res.status(200).send({
        success: true,
        message: `Đã hủy chuyến xe và hoàn tiền tự động cho ${activeBookings.length} vé.`,
      });
    }
    if (bookings.length > 0) {
      return res.status(200).send({
        success: false,
        message: "Không thể xóa chuyến xe vì vẫn còn lịch sử vé liên quan.",
      });
    }
    const hasBookings = await Bus.hasBookings(busId);
    if (hasBookings) {
      return res.status(200).send({
        success: false,
        message: "Không thể xóa tuyến xe này vì đã có khách hàng đặt vé! Vui lòng chuyển hoặc hủy các vé liên quan trước.",
      });
    }
    await Bus.findByIdAndDelete(busId);
    return res.status(200).send({
      success: true,
      message: "Xóa tuyến xe thành công",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Get all buses (with optional filters) ──────────────────────────────────
router.post("/get-all-buses", authMiddleware, async (req, res) => {
  try {
    const buses = await Bus.find(req.body);
    return res.status(200).send({
      success: true,
      message: "Lấy danh sách chuyến xe thành công",
      data: buses,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Get bus by id (including real-time held seats by other users) ───────────
router.post("/get-bus-by-id", authMiddleware, async (req, res) => {
  try {
    const busId = req.body._id || req.body.id;
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(200).send({
        success: false,
        message: "Không tìm thấy thông tin chuyến xe",
      });
    }

    const { heldByOthers, heldByMe } = await SeatLock.getHeldSeats(busId, req.body.userId);

    return res.status(200).send({
      success: true,
      message: "Lấy chi tiết chuyến xe thành công",
      data: {
        ...bus,
        seatsHeldByOthers: heldByOthers,
        seatsHeldByMe: heldByMe,
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Hold seats temporarily (10-min lock across accounts) ───────────────────
router.post("/hold-seats", authMiddleware, async (req, res) => {
  try {
    const busId = req.body.busId || req.body.bus;
    const { seats } = req.body;
    const userId = req.body.userId;

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      // Release if empty
      await SeatLock.releaseSeats(busId, userId);
      return res.status(200).send({
        success: true,
        message: "Đã giải phóng ghế giữ chỗ.",
      });
    }

    const result = await SeatLock.holdSeats(busId, seats, userId);
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Release seats ──────────────────────────────────────────────────────────
router.post("/release-seats", authMiddleware, async (req, res) => {
  try {
    const busId = req.body.busId || req.body.bus;
    const userId = req.body.userId;
    const { seats } = req.body;

    await SeatLock.releaseSeats(busId, userId, seats);
    return res.status(200).send({
      success: true,
      message: "Đã giải phóng ghế thành công.",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Update real-time GPS coordinates (Staff / Tracker) ─────────────────────
router.post("/update-gps", authMiddleware, async (req, res) => {
  try {
    const busId = req.body._id || req.body.id || req.body.busId;
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).send({
        success: false,
        message: "Thiếu thông tin tọa độ GPS (lat, lng)",
      });
    }
    await Bus.updateGps(busId, parseFloat(lat), parseFloat(lng));
    return res.status(200).send({
      success: true,
      message: "Cập nhật vị trí GPS thời gian thực thành công",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Update bus status (Staff toggle Running / Stopping / Completed) ────────
router.post("/update-bus-status", authMiddleware, async (req, res) => {
  try {
    const { busId, status } = req.body;
    const validStatuses = ["Yet To Start", "Running", "Stopping", "Completed"];
    if (!busId || !validStatuses.includes(status)) {
      return res.status(400).send({ success: false, message: "Thiếu busId hoặc status" });
    }
    const existingBus = await Bus.findById(busId);
    if (!existingBus) {
      return res.status(404).send({ success: false, message: "Không tìm thấy chuyến xe" });
    }
    if (existingBus.status === "Completed") {
      return res.status(200).send({
        success: false,
        message: "Chuyến xe đã hoàn thành và không thể thay đổi trạng thái.",
      });
    }
    if (existingBus.status !== "Yet To Start" && status === "Yet To Start") {
      return res.status(200).send({
        success: false,
        message: "Chuyến xe đã bắt đầu và không thể quay lại trạng thái chưa chạy.",
      });
    }
    await Bus.findByIdAndUpdate(busId, { status });
    return res.status(200).send({
      success: true,
      message: `Đã chuyển trạng thái xe sang: "${status}" thành công!`,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Get the single bus assigned to this staff / driver ─────────────────────
router.post("/get-my-assigned-bus", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const bus = await Bus.findByDriverId(userId);
    return res.status(200).send({
      success: true,
      message: bus ? "Lấy thông tin chuyến xe phụ trách thành công" : "Chưa có chuyến xe nào được chỉ định cho bạn.",
      data: bus || null,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Assign or switch the single bus this staff / driver manages ────────────
router.post("/assign-my-bus", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const { busId, driverName } = req.body;
    if (!busId) {
      return res.status(400).send({ success: false, message: "Vui lòng chọn chuyến xe cần nhận phụ trách." });
    }
    const existingBus = await Bus.findById(busId);
    if (!existingBus) {
      return res.status(404).send({ success: false, message: "Không tìm thấy chuyến xe" });
    }
    if (existingBus.status !== "Yet To Start") {
      return res.status(200).send({
        success: false,
        message: "Chuyến xe đã bắt đầu hoạt động và không thể thay đổi nhân viên phụ trách.",
      });
    }
    const driver = await User.findById(userId);
    if (!driver || driver.role !== "Staff") {
      return res.status(403).send({ success: false, message: "Chỉ tài khoản Staff mới được nhận phụ trách chuyến xe." });
    }
    await Bus.assignDriver(busId, userId, driverName || "Nhân viên");
    const assignedBus = await Bus.findById(busId);
    return res.status(200).send({
      success: true,
      message: `Đã nhận phụ trách chuyến xe: ${assignedBus?.name} (${assignedBus?.number}) thành công!`,
      data: assignedBus,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
