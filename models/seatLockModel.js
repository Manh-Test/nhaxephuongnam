const { getPool, sql } = require("../config/dbConfig");

// In-memory + Database seat lock manager (10 minutes TTL)
const LOCK_DURATION_MINUTES = 10;

const SeatLock = {
  // Ensure table exists
  async initTable() {
    try {
      const pool = getPool();
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SeatLocks' AND xtype='U')
        BEGIN
          CREATE TABLE SeatLocks (
            id INT IDENTITY(1,1) PRIMARY KEY,
            busId INT NOT NULL REFERENCES Buses(id),
            seatNumber INT NOT NULL,
            userId INT NOT NULL REFERENCES Users(id),
            lockedAt DATETIME NOT NULL DEFAULT GETDATE(),
            expiresAt DATETIME NOT NULL
          );
          CREATE INDEX IX_SeatLocks_Bus_Seat ON SeatLocks(busId, seatNumber);
        END
      `);
    } catch (e) {
      console.error("Error creating SeatLocks table:", e.message);
    }
  },

  // Clean expired locks
  async cleanExpired() {
    try {
      const pool = getPool();
      await pool.request().query("DELETE FROM SeatLocks WHERE expiresAt < GETDATE()");
    } catch (e) {
      console.error("Error cleaning expired locks:", e.message);
    }
  },

  // Get active held seats for a bus (grouped by whether they belong to the current user or other users)
  async getHeldSeats(busId, currentUserId) {
    await this.cleanExpired();
    const pool = getPool();
    const result = await pool
      .request()
      .input("busId", sql.Int, busId)
      .query(`
        SELECT seatNumber, userId, expiresAt, DATEDIFF(second, GETDATE(), expiresAt) AS remainingSeconds
        FROM SeatLocks 
        WHERE busId = @busId AND expiresAt > GETDATE()
      `);

    const heldByOthers = [];
    const heldByMe = [];

    result.recordset.forEach((row) => {
      if (row.userId === currentUserId) {
        heldByMe.push(row.seatNumber);
      } else {
        heldByOthers.push(row.seatNumber);
      }
    });

    return { heldByOthers, heldByMe, allLocks: result.recordset };
  },

  // Attempt to hold seats for a user
  async holdSeats(busId, seats, userId) {
    await this.cleanExpired();
    const pool = getPool();

    // 1. Check if any seat is already booked on the Bus
    const busRes = await pool
      .request()
      .input("busId", sql.Int, busId)
      .query("SELECT seatsBooked FROM Buses WHERE id = @busId");
    
    if (busRes.recordset.length === 0) {
      return { success: false, message: "Không tìm thấy chuyến xe." };
    }

    const seatsBooked = JSON.parse(busRes.recordset[0].seatsBooked || "[]");
    const conflictBooked = seats.find((s) => seatsBooked.includes(s));
    if (conflictBooked) {
      return {
        success: false,
        message: `Ghế số ${conflictBooked} đã được đặt mua trước đó. Vui lòng chọn ghế khác!`,
      };
    }

    // 2. Check if any seat is locked by ANOTHER user
    const lockRes = await pool
      .request()
      .input("busId", sql.Int, busId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT seatNumber, userId 
        FROM SeatLocks 
        WHERE busId = @busId AND expiresAt > GETDATE() AND userId != @userId
      `);

    const lockedByOthers = lockRes.recordset.map((r) => r.seatNumber);
    const conflictHeld = seats.find((s) => lockedByOthers.includes(s));
    if (conflictHeld) {
      return {
        success: false,
        message: `Ghế số ${conflictHeld} đang được khách hàng khác tạm giữ chỗ. Vui lòng chọn ghế khác!`,
      };
    }

    // 3. Clear existing locks for this user on this bus and insert new lock
    await pool
      .request()
      .input("busId", sql.Int, busId)
      .input("userId", sql.Int, userId)
      .query("DELETE FROM SeatLocks WHERE busId = @busId AND userId = @userId");

    for (const seatNum of seats) {
      await pool
        .request()
        .input("busId", sql.Int, busId)
        .input("seatNumber", sql.Int, seatNum)
        .input("userId", sql.Int, userId)
        .input("duration", sql.Int, LOCK_DURATION_MINUTES)
        .query(`
          INSERT INTO SeatLocks (busId, seatNumber, userId, lockedAt, expiresAt)
          VALUES (@busId, @seatNumber, @userId, GETDATE(), DATEADD(minute, @duration, GETDATE()))
        `);
    }

    return {
      success: true,
      message: "Tạm giữ chỗ thành công!",
      expiresInSeconds: LOCK_DURATION_MINUTES * 60,
    };
  },

  // Release seats when user leaves page, deselects, or after payment
  async releaseSeats(busId, userId, seats = null) {
    const pool = getPool();
    const request = pool
      .request()
      .input("busId", sql.Int, busId)
      .input("userId", sql.Int, userId);

    if (seats && Array.isArray(seats) && seats.length > 0) {
      const seatList = seats.join(",");
      await request.query(`DELETE FROM SeatLocks WHERE busId = @busId AND userId = @userId AND seatNumber IN (${seatList})`);
    } else {
      await request.query("DELETE FROM SeatLocks WHERE busId = @busId AND userId = @userId");
    }
  },
};

module.exports = SeatLock;
