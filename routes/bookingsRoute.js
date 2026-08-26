const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingsModel");
const Bus = require("../models/busModel");
const Voucher = require("../models/vouchersModel");
const Transaction = require("../models/transactionsModel");
const stripe = require("stripe")(process.env.stripe_key);
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const { sendBookingReceipt } = require("../config/emailService");

// Helper to generate readable ticket code
function generateTicketCode() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `NXPN-${year}-${randomPart}`;
}

// ── Book a seat ────────────────────────────────────────────────────────────
router.post("/book-seat", authMiddleware, async (req, res) => {
  try {
    const {
      bus: busId,
      seats,
      transactionId,
      passengerName,
      passengerPhone,
      passengerEmail,
      boardingStop,
      alightingStop,
      voucherCode,
      discountAmount,
      totalAmount,
      paymentMethod,
    } = req.body;
    
    // Check if any seat is already booked
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).send({ success: false, message: "Không tìm thấy thông tin tuyến xe." });
    }

    const alreadyBooked = seats.some((s) => bus.seatsBooked.includes(s));
    if (alreadyBooked) {
      return res.status(400).send({
        success: false,
        message: "Một hoặc nhiều ghế đã được người khác đặt trước. Vui lòng chọn ghế khác.",
      });
    }

    const ticketCode = generateTicketCode();
    const finalTransactionId = transactionId || `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;

    // 1. Create booking record
    const newBooking = await Booking.create({
      bus: busId,
      user: req.body.userId,
      seats: seats,
      passengerName: passengerName || "",
      passengerPhone: passengerPhone || "",
      passengerEmail: passengerEmail || "",
      boardingStop: boardingStop || bus.from || "",
      alightingStop: alightingStop || bus.to || "",
      ticketCode: ticketCode,
      voucherCode: voucherCode || "",
      discountAmount: Number(discountAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: "Paid",
      paymentMethod: paymentMethod || "Online",
      transactionId: finalTransactionId,
    });

    // 2. Update the bus seatsBooked list
    const updatedSeats = [...bus.seatsBooked, ...seats];
    await Bus.findByIdAndUpdate(busId, { seatsBooked: updatedSeats });

    // 3. Release seat locks for this user
    const SeatLock = require("../models/seatLockModel");
    await SeatLock.releaseSeats(busId, req.body.userId).catch(() => {});

    // 4. Increment voucher usage if applied
    if (voucherCode) {
      await Voucher.incrementUsage(voucherCode).catch(() => {});
    }

    // 5. Record transaction in Transactions table
    await Transaction.create({
      transactionId: finalTransactionId,
      bookingId: newBooking.id,
      userId: req.body.userId,
      amount: Number(totalAmount) || 0,
      paymentMethod: paymentMethod || "Online",
      status: "Success",
    }).catch((err) => console.error("Error logging transaction:", err));

    // 6. Generate QR Code Data URL for ticket
    const qrData = JSON.stringify({
      ticketCode,
      bookingId: newBooking.id,
      busNumber: bus.number,
      from: boardingStop || bus.from,
      to: alightingStop || bus.to,
      departure: bus.departure,
      journeyDate: bus.journeyDate,
      seats: seats,
      passenger: passengerName || "",
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData).catch(() => "");

    // Email delivery must not turn a completed booking into a failed response.
    await sendBookingReceipt({ booking: newBooking, bus, qrCodeUrl }).catch((error) => {
      console.error("Error sending booking receipt:", error.message);
    });

    res.status(200).send({
      message: "Đặt vé và thanh toán thành công!",
      data: {
        ...newBooking,
        ticketCode,
        qrCodeUrl,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Đặt vé thất bại",
      data: error,
      success: false,
    });
  }
});

// ── Make payment (Stripe or Demo checkout) ─────────────────────────────────
router.post("/make-payment", authMiddleware, async (req, res) => {
  try {
    const { token, amount, paymentMethod } = req.body;
    
    // If stripe token provided
    if (token && token.id) {
      try {
        const customer = await stripe.customers.create({
          email: token.email,
          source: token.id,
        });
        const payment = await stripe.charges.create(
          {
            amount: Math.round(Number(amount) / 100) || 1000,
            currency: "usd",
            customer: customer.id,
            receipt_email: token.email,
          },
          {
            idempotencyKey: uuidv4(),
          }
        );

        return res.status(200).send({
          message: "Thanh toán qua Stripe thành công",
          data: {
            transactionId: payment.id || payment.source.id,
            paymentMethod: paymentMethod || "Card",
          },
          success: true,
        });
      } catch (stripeErr) {
        console.warn("Stripe charge fallback:", stripeErr.message);
        // Fallback for dev / test simulation
        return res.status(200).send({
          message: "Thanh toán thành công (Mô phỏng)",
          data: {
            transactionId: `ST_DEMO_${uuidv4().substring(0, 8).toUpperCase()}`,
            paymentMethod: paymentMethod || "Card",
          },
          success: true,
        });
      }
    }

    // Direct online payment simulation
    res.status(200).send({
      message: "Thanh toán trực tuyến thành công",
      data: {
        transactionId: `PAY_${Date.now()}`,
        paymentMethod: paymentMethod || "Online",
      },
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Thanh toán thất bại: " + error.message,
      data: error,
      success: false,
    });
  }
});

// ── Get bookings by user id ────────────────────────────────────────────────
router.post("/get-bookings-by-user-id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.findByUserId(req.body.userId);
    res.status(200).send({
      message: "Lấy danh sách vé đã đặt thành công",
      data: bookings,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Không thể lấy danh sách vé",
      data: error,
      success: false,
    });
  }
});

// ── Get all bookings (Admin) ───────────────────────────────────────────────
router.post("/get-all-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.findAll();
    res.status(200).send({
      message: "Lấy toàn bộ danh sách vé thành công",
      data: bookings,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Không thể lấy danh sách vé",
      data: error,
      success: false,
    });
  }
});

// ── Verify ticket (Conductor / Staff QR Scanner) ───────────────────────────
router.post("/verify-ticket", authMiddleware, async (req, res) => {
  try {
    const { ticketCode, bookingId, expectedBusId } = req.body;
    let booking = null;

    if (ticketCode) {
      booking = await Booking.findByTicketCode(ticketCode);
    } else if (bookingId) {
      booking = await Booking.findById(bookingId);
    }

    if (!booking) {
      return res.status(200).send({
        success: false,
        message: "❌ Mã vé không hợp lệ hoặc không tồn tại trên hệ thống!",
        data: null,
      });
    }

    // Check if ticket belongs to the staff's currently assigned bus
    if (expectedBusId && Number(booking.bus.id) !== Number(expectedBusId)) {
      return res.status(200).send({
        success: false,
        isWrongBus: true,
        message: `⚠️ CẢNH BÁO SAI CHUYẾN: Vé này thuộc chuyến ${booking.bus.name} (${booking.bus.number}), KHÔNG PHẢI chuyến xe bạn đang phụ trách!`,
        data: booking,
      });
    }

    // Check status
    if (booking.status === "Cancelled") {
      return res.status(200).send({
        success: false,
        message: "⚠️ Vé này đã bị HỦY trước đó!",
        data: booking,
      });
    }

    if (booking.status === "Boarded") {
      return res.status(200).send({
        success: false,
        isAlreadyBoarded: true,
        message: `⚠️ Vé đã được soát lúc ${new Date(booking.boardedAt || booking.updatedAt).toLocaleString("vi-VN")}`,
        data: booking,
      });
    }

    return res.status(200).send({
      success: true,
      message: "✅ Vé hợp lệ! Sẵn sàng đón hành khách lên xe.",
      data: booking,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Mark ticket as Boarded (Đã lên xe) ─────────────────────────────────────
router.post("/mark-boarded", authMiddleware, async (req, res) => {
  try {
    const { bookingId, ticketCode } = req.body;
    let targetBooking = null;

    if (bookingId) {
      targetBooking = await Booking.findById(bookingId);
    } else if (ticketCode) {
      targetBooking = await Booking.findByTicketCode(ticketCode);
    }

    if (!targetBooking) {
      return res.status(404).send({ success: false, message: "Không tìm thấy vé" });
    }

    if (targetBooking.status === "Boarded") {
      return res.status(200).send({
        success: false,
        message: "Vé này đã được xác nhận lên xe trước đó rồi!",
      });
    }

    if (targetBooking.status === "Cancelled") {
      return res.status(400).send({
        success: false,
        message: "Không thể soát vé đã bị hủy!",
      });
    }

    await Booking.updateStatus(targetBooking.id, "Boarded");

    return res.status(200).send({
      success: true,
      message: `✅ Đã xác nhận hành khách ${targetBooking.passengerName || targetBooking.user.name} lên xe thành công! (Ghế: ${targetBooking.seats.join(", ")})`,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// ── Cancel / Refund booking ────────────────────────────────────────────────
router.post("/cancel-booking", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send({ success: false, message: "Không tìm thấy vé" });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).send({ success: false, message: "Vé này đã được hủy trước đó." });
    }

    if (booking.status === "Boarded") {
      return res.status(400).send({
        success: false,
        message: "Hành khách đã lên xe, không thể thực hiện hủy vé!",
      });
    }

    // 1. Mark booking as Cancelled
    await Booking.updateStatus(booking.id, "Cancelled");

    // 2. Free up the seats on the Bus
    const bus = await Bus.findById(booking.bus.id);
    if (bus) {
      const remainingSeats = bus.seatsBooked.filter((s) => !booking.seats.includes(s));
      await Bus.findByIdAndUpdate(bus.id, { seatsBooked: remainingSeats });
    }

    // 3. Log refund transaction
    await Transaction.create({
      transactionId: `REFUND_${booking.transactionId}`,
      bookingId: booking.id,
      userId: booking.user.id,
      amount: -booking.totalAmount,
      paymentMethod: "Refund",
      status: "Refunded",
    }).catch(() => {});

    return res.status(200).send({
      success: true,
      message: "Hủy vé thành công! Ghế đã được giải phóng và yêu cầu hoàn tiền đã ghi nhận.",
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
