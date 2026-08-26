const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeSeats(seats) {
  if (Array.isArray(seats)) return seats;
  try {
    const parsedSeats = JSON.parse(seats || "[]");
    return Array.isArray(parsedSeats) ? parsedSeats : [];
  } catch {
    return [];
  }
}

function getTransporter() {
  if (!process.env.MAIL_USER || !process.env.MAIL_APP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT || 465),
    secure: true,
    tls: { servername: "smtp.gmail.com" },
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_APP_PASSWORD.replace(/\s/g, ""),
    },
  });
}

async function sendBookingReceipt({ booking, bus, qrCodeUrl }) {
  const recipient = process.env.MAIL_RECEIPT_TO || booking.passengerEmail;
  if (!recipient) {
    console.log("Receipt email skipped: no passenger email was provided.");
    return;
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Receipt email skipped: MAIL_USER or MAIL_APP_PASSWORD is not configured.");
    return;
  }

  console.log(`Sending booking receipt to ${recipient}`);

  const qrImage = qrCodeUrl ? Buffer.from(qrCodeUrl.split(",")[1], "base64") : null;
  const seats = normalizeSeats(booking.seats);
  const amount = Number(booking.totalAmount || 0).toLocaleString("vi-VN");
  const subject = `Vé xe Phương Nam - ${booking.ticketCode}`;

  await transporter.sendMail({
    from: `Nhà xe Phương Nam <${process.env.MAIL_USER}>`,
    to: recipient,
    subject,
    text: [
      "Đặt vé thành công - Nhà xe Phương Nam",
      `Mã vé: ${booking.ticketCode}`,
      `Tuyến: ${booking.boardingStop} -> ${booking.alightingStop}`,
      `Ghế: ${seats.join(", ")}`,
      `Ngày: ${bus.journeyDate} lúc ${bus.departure}`,
      `Tổng tiền: ${amount} VNĐ`,
    ].join("\n"),
    html: `
      <h2>Đặt vé thành công - Nhà xe Phương Nam</h2>
      <p>Xin chào ${escapeHtml(booking.passengerName)}, vé của bạn đã được thanh toán.</p>
      <table cellpadding="6" cellspacing="0" border="1">
        <tr><td><b>Mã vé</b></td><td>${escapeHtml(booking.ticketCode)}</td></tr>
        <tr><td><b>Tuyến</b></td><td>${escapeHtml(booking.boardingStop)} -&gt; ${escapeHtml(booking.alightingStop)}</td></tr>
        <tr><td><b>Ngày / giờ</b></td><td>${escapeHtml(bus.journeyDate)} - ${escapeHtml(bus.departure)}</td></tr>
        <tr><td><b>Ghế</b></td><td>${escapeHtml(seats.join(", "))}</td></tr>
        <tr><td><b>Tổng tiền</b></td><td>${escapeHtml(amount)} VNĐ</td></tr>
        <tr><td><b>Giao dịch</b></td><td>${escapeHtml(booking.transactionId)}</td></tr>
      </table>
      ${qrImage ? "<p>Mã QR vé được đính kèm trong email.</p>" : ""}
    `,
    attachments: qrImage
      ? [{ filename: `${booking.ticketCode}.png`, content: qrImage, cid: "ticket-qr" }]
      : [],
  });
}

module.exports = { sendBookingReceipt };