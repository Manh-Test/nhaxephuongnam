const { getPool, sql } = require("../config/dbConfig");

function mapRow(row) {
  if (!row) return null;
  let stops = [];
  try {
    stops = JSON.parse(row.busStops || "[]");
  } catch (_) {}

  const busId = Number(Array.isArray(row.busId) ? row.busId[0] : (row.actualBusId || row.busId));
  const userId = Number(Array.isArray(row.userId) ? row.userId[0] : (row.actualUserId || row.userId));

  return {
    _id: row.bookingId,
    id: row.bookingId,
    ticketCode: row.ticketCode,
    passengerName: row.passengerName,
    passengerPhone: row.passengerPhone,
    passengerEmail: row.passengerEmail,
    boardingStop: row.boardingStop || row.busFromCity,
    alightingStop: row.alightingStop || row.busToCity,
    seats: JSON.parse(row.seats || "[]"),
    voucherCode: row.voucherCode,
    discountAmount: Number(row.discountAmount) || 0,
    totalAmount: Number(row.totalAmount) || 0,
    status: row.status || "Paid",
    boardedAt: row.boardedAt,
    paymentMethod: row.paymentMethod || "Online",
    transactionId: row.transactionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    bus: {
      _id: busId,
      id: busId,
      name: row.busName,
      number: row.busNumber,
      capacity: row.busCapacity,
      from: row.busFromCity,
      to: row.busToCity,
      stops: stops,
      journeyDate: row.busJourneyDate,
      departure: row.busDeparture,
      arrival: row.busArrival,
      type: row.busType,
      fare: Number(row.busFare),
      seatsBooked: JSON.parse(row.busSeatsBooked || "[]"),
      status: row.busStatus,
      currentLatitude: row.currentLatitude,
      currentLongitude: row.currentLongitude,
    },
    user: {
      _id: userId,
      id: userId,
      name: row.userName,
      email: row.userEmail,
      phone: row.userPhone,
      role: row.userRole,
      isAdmin: !!row.userIsAdmin,
      isBlocked: !!row.userIsBlocked,
    },
  };
}

const POPULATED_SELECT = `
  SELECT
    b.id            AS bookingId,
    b.busId         AS bookingBusId,
    b.userId        AS bookingUserId,
    b.seats,
    b.passengerName,
    b.passengerPhone,
    b.passengerEmail,
    b.ticketCode,
    b.boardingStop,
    b.alightingStop,
    b.voucherCode,
    b.discountAmount,
    b.totalAmount,
    b.status,
    b.boardedAt,
    b.paymentMethod,
    b.transactionId,
    b.createdAt,
    b.updatedAt,
    -- Bus fields
    bs.id           AS actualBusId,
    bs.name         AS busName,
    bs.number       AS busNumber,
    bs.capacity     AS busCapacity,
    bs.fromCity     AS busFromCity,
    bs.toCity       AS busToCity,
    bs.stops        AS busStops,
    bs.journeyDate  AS busJourneyDate,
    bs.departure    AS busDeparture,
    bs.arrival      AS busArrival,
    bs.type         AS busType,
    bs.fare         AS busFare,
    bs.seatsBooked  AS busSeatsBooked,
    bs.status       AS busStatus,
    bs.currentLatitude,
    bs.currentLongitude,
    -- User fields
    u.id            AS actualUserId,
    u.name          AS userName,
    u.email         AS userEmail,
    u.phone         AS userPhone,
    u.role          AS userRole,
    u.isAdmin       AS userIsAdmin,
    u.isBlocked     AS userIsBlocked
  FROM Bookings b
  INNER JOIN Buses bs ON b.busId = bs.id
  INNER JOIN Users u  ON b.userId = u.id
`;

const Booking = {
  async create(data) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("busId", sql.Int, data.bus)
      .input("userId", sql.Int, data.user)
      .input("seats", sql.NVarChar, JSON.stringify(data.seats || []))
      .input("passengerName", sql.NVarChar, data.passengerName || "")
      .input("passengerPhone", sql.NVarChar, data.passengerPhone || "")
      .input("passengerEmail", sql.NVarChar, data.passengerEmail || "")
      .input("ticketCode", sql.NVarChar, data.ticketCode || "")
      .input("boardingStop", sql.NVarChar, data.boardingStop || "")
      .input("alightingStop", sql.NVarChar, data.alightingStop || "")
      .input("voucherCode", sql.NVarChar, data.voucherCode || "")
      .input("discountAmount", sql.Decimal(10, 2), data.discountAmount || 0)
      .input("totalAmount", sql.Decimal(10, 2), data.totalAmount || 0)
      .input("status", sql.NVarChar, data.status || "Paid")
      .input("paymentMethod", sql.NVarChar, data.paymentMethod || "Online")
      .input("transactionId", sql.NVarChar, data.transactionId || "")
      .query(`
        INSERT INTO Bookings (
          busId, userId, seats, passengerName, passengerPhone, passengerEmail,
          ticketCode, boardingStop, alightingStop, voucherCode, discountAmount, totalAmount, status, paymentMethod, transactionId
        )
        OUTPUT INSERTED.*
        VALUES (
          @busId, @userId, @seats, @passengerName, @passengerPhone, @passengerEmail,
          @ticketCode, @boardingStop, @alightingStop, @voucherCode, @discountAmount, @totalAmount, @status, @paymentMethod, @transactionId
        )
      `);
    return result.recordset[0];
  },

  async findById(id) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`${POPULATED_SELECT} WHERE b.id = @id`);
    return mapRow(result.recordset[0]);
  },

  async findByTicketCode(ticketCode) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("ticketCode", sql.NVarChar, ticketCode.trim())
      .query(`${POPULATED_SELECT} WHERE b.ticketCode = @ticketCode`);
    return mapRow(result.recordset[0]);
  },

  async findByUserId(userId) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`${POPULATED_SELECT} WHERE b.userId = @userId ORDER BY b.id DESC`);
    return result.recordset.map(mapRow);
  },

  async findAll() {
    const pool = getPool();
    const result = await pool.request().query(`${POPULATED_SELECT} ORDER BY b.id DESC`);
    return result.recordset.map(mapRow);
  },

  async findByBusId(busId) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("busId", sql.Int, busId)
      .query(`${POPULATED_SELECT} WHERE b.busId = @busId ORDER BY b.id`);
    return result.recordset.map(mapRow);
  },

  async updateStatus(id, status, extra = {}) {
    const pool = getPool();
    const request = pool.request().input("id", sql.Int, id).input("status", sql.NVarChar, status);
    let extraSql = "";
    if (status === "Boarded") {
      extraSql = ", boardedAt = GETDATE()";
    }
    await request.query(`
      UPDATE Bookings 
      SET status = @status, updatedAt = GETDATE() ${extraSql}
      WHERE id = @id
    `);
  },
};

module.exports = Booking;
