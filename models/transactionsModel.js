const { getPool, sql } = require("../config/dbConfig");

function mapTransaction(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    transactionId: row.transactionId,
    bookingId: row.bookingId,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userPhone: row.userPhone,
    ticketCode: row.ticketCode,
    busNumber: row.busNumber,
    busName: row.busName,
    fromCity: row.fromCity,
    toCity: row.toCity,
    amount: Number(row.amount),
    paymentMethod: row.paymentMethod,
    status: row.status,
    createdAt: row.createdAt,
  };
}

const Transaction = {
  async create(data) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("transactionId", sql.NVarChar, data.transactionId)
      .input("bookingId", sql.Int, data.bookingId || null)
      .input("userId", sql.Int, data.userId)
      .input("amount", sql.Decimal(10, 2), data.amount)
      .input("paymentMethod", sql.NVarChar, data.paymentMethod || "Online")
      .input("status", sql.NVarChar, data.status || "Success")
      .query(`
        INSERT INTO Transactions (transactionId, bookingId, userId, amount, paymentMethod, status)
        OUTPUT INSERTED.*
        VALUES (@transactionId, @bookingId, @userId, @amount, @paymentMethod, @status)
      `);
    return result.recordset[0];
  },

  async find(filter = {}) {
    const pool = getPool();
    const request = pool.request();
    const where = [];

    if (filter.transactionId) {
      request.input("transactionId", sql.NVarChar, `%${filter.transactionId}%`);
      where.push("t.transactionId LIKE @transactionId");
    }
    if (filter.status) {
      request.input("status", sql.NVarChar, filter.status);
      where.push("t.status = @status");
    }
    if (filter.paymentMethod) {
      request.input("paymentMethod", sql.NVarChar, filter.paymentMethod);
      where.push("t.paymentMethod = @paymentMethod");
    }
    if (filter.startDate) {
      request.input("startDate", sql.DateTime, new Date(filter.startDate));
      where.push("t.createdAt >= @startDate");
    }
    if (filter.endDate) {
      request.input("endDate", sql.DateTime, new Date(filter.endDate));
      where.push("t.createdAt <= @endDate");
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const query = `
      SELECT 
        t.id,
        t.transactionId,
        t.bookingId,
        t.userId,
        t.amount,
        t.paymentMethod,
        t.status,
        t.createdAt,
        u.name AS userName,
        u.email AS userEmail,
        u.phone AS userPhone,
        b.ticketCode,
        bs.number AS busNumber,
        bs.name AS busName,
        bs.fromCity,
        bs.toCity
      FROM Transactions t
      LEFT JOIN Users u ON t.userId = u.id
      LEFT JOIN Bookings b ON t.bookingId = b.id
      LEFT JOIN Buses bs ON b.busId = bs.id
      ${whereClause}
      ORDER BY t.id DESC
    `;

    const result = await request.query(query);
    return result.recordset.map(mapTransaction);
  },
};

module.exports = Transaction;
