/**
 * seedData.js — Populate rich multi-stop sample data for testing all 18 features.
 * Usage: node config/seedData.js
 */
require("dotenv").config();
const sql = require("mssql/msnodesqlv8");
const bcrypt = require("bcryptjs");

const server = process.env.DB_SERVER || "localhost";
const dbName = process.env.DB_DATABASE || "NhaXePhuongNam";

const dbConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${dbName};Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
};

async function upsertUser(pool, u) {
  const exists = await pool
    .request()
    .input("email", sql.NVarChar, u.email)
    .query("SELECT id FROM Users WHERE email = @email");

  if (exists.recordset.length === 0) {
    await pool
      .request()
      .input("name",     sql.NVarChar, u.name)
      .input("email",    sql.NVarChar, u.email)
      .input("phone",    sql.NVarChar, u.phone)
      .input("password", sql.NVarChar, u.password)
      .input("role",     sql.NVarChar, u.role)
      .input("isAdmin",  sql.Bit,      u.isAdmin)
      .query(`
        INSERT INTO Users (name, email, phone, password, role, isAdmin, isBlocked, failedLoginAttempts)
        VALUES (@name, @email, @phone, @password, @role, @isAdmin, 0, 0)
      `);
    console.log(`  + User created: ${u.email} (${u.role})`);
  } else {
    await pool
      .request()
      .input("id",       sql.Int,      exists.recordset[0].id)
      .input("password", sql.NVarChar, u.password)
      .input("role",     sql.NVarChar, u.role)
      .input("isAdmin",  sql.Bit,      u.isAdmin)
      .input("phone",    sql.NVarChar, u.phone)
      .query(`
        UPDATE Users 
        SET password = @password, role = @role, isAdmin = @isAdmin,
            phone = @phone, isBlocked = 0, failedLoginAttempts = 0, lockUntil = NULL
        WHERE id = @id
      `);
    console.log(`  * User updated: ${u.email} (${u.role})`);
  }
  const r = await pool
    .request()
    .input("email", sql.NVarChar, u.email)
    .query("SELECT id FROM Users WHERE email = @email");
  return r.recordset[0].id;
}

async function upsertBus(pool, b) {
  const fromCity = b.stops[0].name;
  const toCity   = b.stops[b.stops.length - 1].name;
  const fare     = b.stops[b.stops.length - 1].fare; // full-route fare

  const exists = await pool
    .request()
    .input("number", sql.NVarChar, b.number)
    .query("SELECT id FROM Buses WHERE number = @number");

  if (exists.recordset.length === 0) {
    await pool
      .request()
      .input("name",        sql.NVarChar,     b.name)
      .input("number",      sql.NVarChar,     b.number)
      .input("capacity",    sql.Int,          b.capacity)
      .input("fromCity",    sql.NVarChar,     fromCity)
      .input("toCity",      sql.NVarChar,     toCity)
      .input("journeyDate", sql.NVarChar,     b.journeyDate)
      .input("departure",   sql.NVarChar,     b.departure)
      .input("arrival",     sql.NVarChar,     b.arrival)
      .input("type",        sql.NVarChar,     b.type)
      .input("fare",        sql.Decimal(10,2),fare)
      .input("seatsBooked", sql.NVarChar,     JSON.stringify(b.seatsBooked || []))
      .input("status",      sql.NVarChar,     b.status)
      .input("lat",         sql.Float,        b.lat)
      .input("lng",         sql.Float,        b.lng)
      .input("stops",       sql.NVarChar,     JSON.stringify(b.stops))
      .query(`
        INSERT INTO Buses
          (name,number,capacity,fromCity,toCity,journeyDate,departure,arrival,
           type,fare,seatsBooked,status,currentLatitude,currentLongitude,lastGpsUpdate,stops)
        VALUES
          (@name,@number,@capacity,@fromCity,@toCity,@journeyDate,@departure,@arrival,
           @type,@fare,@seatsBooked,@status,@lat,@lng,GETDATE(),@stops)
      `);
    console.log(`  + Bus created: ${b.name} (${b.number})`);
  } else {
    await pool
      .request()
      .input("id",          sql.Int,          exists.recordset[0].id)
      .input("name",        sql.NVarChar,     b.name)
      .input("fromCity",    sql.NVarChar,     fromCity)
      .input("toCity",      sql.NVarChar,     toCity)
      .input("journeyDate", sql.NVarChar,     b.journeyDate)
      .input("departure",   sql.NVarChar,     b.departure)
      .input("arrival",     sql.NVarChar,     b.arrival)
      .input("status",      sql.NVarChar,     b.status)
      .input("fare",        sql.Decimal(10,2),fare)
      .input("stops",       sql.NVarChar,     JSON.stringify(b.stops))
      .input("seatsBooked", sql.NVarChar,     JSON.stringify(b.seatsBooked || []))
      .input("lat",         sql.Float,        b.lat)
      .input("lng",         sql.Float,        b.lng)
      .query(`
        UPDATE Buses SET
          name=@name,fromCity=@fromCity,toCity=@toCity,journeyDate=@journeyDate,
          departure=@departure,arrival=@arrival,status=@status,fare=@fare,
          stops=@stops,seatsBooked=@seatsBooked,
          currentLatitude=@lat,currentLongitude=@lng,lastGpsUpdate=GETDATE()
        WHERE id = @id
      `);
    console.log(`  * Bus updated: ${b.name} (${b.number})`);
  }

  const r = await pool.request().input("number", sql.NVarChar, b.number)
    .query("SELECT id FROM Buses WHERE number = @number");
  return r.recordset[0].id;
}

async function seedData() {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log(`Connected to ${dbName} for seeding...`);

    // ── USERS ──
    const adminPass    = await bcrypt.hash("admin123", 10);
    const staffPass    = await bcrypt.hash("staff123", 10);
    const customerPass = await bcrypt.hash("khach123", 10);

    const customerId = await upsertUser(pool, {
      name: "Phạm Minh Khách",
      email: "khachhang@phuongnam.vn",
      phone: "0933557799",
      password: customerPass,
      role: "Customer",
      isAdmin: 0,
    });
    await upsertUser(pool, {
      name: "Nguyễn Văn Quản Lý",
      email: "admin@phuongnam.vn",
      phone: "0909123456",
      password: adminPass,
      role: "Admin",
      isAdmin: 1,
    });
    await upsertUser(pool, {
      name: "Trần Hữu Tài (Tài xế)",
      email: "taixe@phuongnam.vn",
      phone: "0918765432",
      password: staffPass,
      role: "Staff",
      isAdmin: 0,
    });
    await upsertUser(pool, {
      name: "Lê Văn Phụ (Phụ xe)",
      email: "phuxe@phuongnam.vn",
      phone: "0988112233",
      password: staffPass,
      role: "Staff",
      isAdmin: 0,
    });

    // ── BUSES (multi-stop) ──
    const today    = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const in2days  = new Date(Date.now() + 172800000).toISOString().split("T")[0];

    const sampleBuses = [
      {
        name: "Nhà xe Phương Nam - Sài Gòn → Đà Lạt (VIP Limousine)",
        number: "51B-888.88",
        capacity: 34,
        journeyDate: today,
        departure: "08:00",
        arrival: "16:00",
        type: "Limousine Giường nằm",
        seatsBooked: [1, 2, 5, 6],
        status: "Running",
        lat: 10.7769, lng: 106.7009,
        stops: [
          { name: "Hồ Chí Minh", arrivalTime: "",      departureTime: "08:00", fare: 0 },
          { name: "Bảo Lộc",     arrivalTime: "12:00", departureTime: "12:15", fare: 180000 },
          { name: "Đà Lạt",      arrivalTime: "15:00", departureTime: "",      fare: 320000 },
        ],
      },
      {
        name: "Nhà xe Phương Nam - Sài Gòn → Nha Trang (Đêm VIP)",
        number: "51B-999.99",
        capacity: 40,
        journeyDate: tomorrow,
        departure: "20:00",
        arrival: "05:30",
        type: "Giường nằm VIP",
        seatsBooked: [3, 4],
        status: "Yet To Start",
        lat: 11.2388, lng: 107.8967,
        stops: [
          { name: "Hồ Chí Minh", arrivalTime: "",      departureTime: "20:00", fare: 0 },
          { name: "Phan Thiết",   arrivalTime: "22:30", departureTime: "22:45", fare: 150000 },
          { name: "Phan Rang",    arrivalTime: "01:00", departureTime: "01:15", fare: 220000 },
          { name: "Nha Trang",    arrivalTime: "04:00", departureTime: "",      fare: 320000 },
        ],
      },
      {
        name: "Nhà xe Phương Nam - Cần Thơ → Sài Gòn (Ghế cao cấp)",
        number: "65B-123.45",
        capacity: 28,
        journeyDate: today,
        departure: "06:00",
        arrival: "09:30",
        type: "Ghế ngồi cao cấp",
        seatsBooked: [],
        status: "Yet To Start",
        lat: 10.0452, lng: 105.7469,
        stops: [
          { name: "Cần Thơ",      arrivalTime: "",      departureTime: "06:00", fare: 0 },
          { name: "Vĩnh Long",    arrivalTime: "07:00", departureTime: "07:10", fare: 60000 },
          { name: "Tiền Giang",   arrivalTime: "08:00", departureTime: "08:10", fare: 110000 },
          { name: "Hồ Chí Minh", arrivalTime: "09:30", departureTime: "",      fare: 170000 },
        ],
      },
      {
        name: "Nhà xe Phương Nam - Sài Gòn → Vũng Tàu (Royal)",
        number: "72B-456.78",
        capacity: 24,
        journeyDate: today,
        departure: "09:00",
        arrival: "11:30",
        type: "Limousine Giường nằm",
        seatsBooked: [1, 2],
        status: "Running",
        lat: 10.4500, lng: 107.1200,
        stops: [
          { name: "Hồ Chí Minh", arrivalTime: "",      departureTime: "09:00", fare: 0 },
          { name: "Bà Rịa",      arrivalTime: "10:30", departureTime: "10:40", fare: 120000 },
          { name: "Vũng Tàu",   arrivalTime: "11:30", departureTime: "",      fare: 190000 },
        ],
      },
      {
        name: "Nhà xe Phương Nam - Đà Nẵng → Hà Nội (Xuyên Việt)",
        number: "43B-777.77",
        capacity: 36,
        journeyDate: tomorrow,
        departure: "07:00",
        arrival: "23:00",
        type: "Giường nằm VIP",
        seatsBooked: [],
        status: "Yet To Start",
        lat: 16.0544, lng: 108.2022,
        stops: [
          { name: "Đà Nẵng",  arrivalTime: "",      departureTime: "07:00", fare: 0 },
          { name: "Huế",       arrivalTime: "09:00", departureTime: "09:15", fare: 100000 },
          { name: "Đồng Hới",  arrivalTime: "12:00", departureTime: "12:15", fare: 200000 },
          { name: "Vinh",      arrivalTime: "16:00", departureTime: "16:15", fare: 320000 },
          { name: "Hà Nội",   arrivalTime: "23:00", departureTime: "",      fare: 450000 },
        ],
      },
      {
        name: "Nhà xe Phương Nam - Hồ Chí Minh → Buôn Ma Thuột",
        number: "47B-555.66",
        capacity: 30,
        journeyDate: in2days,
        departure: "06:30",
        arrival: "14:30",
        type: "Ghế ngồi cao cấp",
        seatsBooked: [],
        status: "Yet To Start",
        lat: 10.7769, lng: 106.7009,
        stops: [
          { name: "Hồ Chí Minh",    arrivalTime: "",      departureTime: "06:30", fare: 0 },
          { name: "Đồng Xoài",      arrivalTime: "08:30", departureTime: "08:45", fare: 100000 },
          { name: "Đắk Nông",       arrivalTime: "11:30", departureTime: "11:45", fare: 200000 },
          { name: "Buôn Ma Thuột",  arrivalTime: "14:30", departureTime: "",      fare: 280000 },
        ],
      },
    ];

    const busIds = {};
    for (const b of sampleBuses) {
      busIds[b.number] = await upsertBus(pool, b);
    }

    // ── VOUCHERS ──
    const vouchers = [
      { code: "PHUONGNAM10", percent: 10, amount: 0,     min: 100000, max: 500 },
      { code: "GIAM30K",     percent: 0,  amount: 30000, min: 150000, max: 300 },
      { code: "WELCOME",     percent: 15, amount: 0,     min: 50000,  max: 1000 },
      { code: "VIP50K",      percent: 0,  amount: 50000, min: 200000, max: 200 },
    ];
    for (const v of vouchers) {
      const ex = await pool.request().input("code", sql.NVarChar, v.code)
        .query("SELECT id FROM Vouchers WHERE code = @code");
      if (ex.recordset.length === 0) {
        await pool.request()
          .input("code",            sql.NVarChar,     v.code)
          .input("discountPercent", sql.Int,          v.percent)
          .input("discountAmount",  sql.Decimal(10,2),v.amount)
          .input("minOrderAmount",  sql.Decimal(10,2),v.min)
          .input("maxUsage",        sql.Int,          v.max)
          .query(`
            INSERT INTO Vouchers (code, discountPercent, discountAmount, minOrderAmount, maxUsage, usedCount, expiryDate, isActive)
            VALUES (@code,@discountPercent,@discountAmount,@minOrderAmount,@maxUsage,0,DATEADD(month,6,GETDATE()),1)
          `);
        console.log(`  + Voucher: ${v.code}`);
      }
    }

    // ── SAMPLE BOOKINGS ──
    const bus1Id = busIds["51B-888.88"];
    const bus2Id = busIds["51B-999.99"];

    const bookings = [
      {
        busId: bus1Id, userId: customerId,
        seats: JSON.stringify([1, 2]),
        passengerName: "Phạm Minh Khách", passengerPhone: "0933557799", passengerEmail: "khachhang@phuongnam.vn",
        ticketCode: "NXPN-2026-888999",
        boardingStop: "Hồ Chí Minh", alightingStop: "Đà Lạt",
        voucherCode: "PHUONGNAM10", discountAmount: 64000, totalAmount: 576000,
        status: "Paid", txId: "TXN-888999-ST",
      },
      {
        busId: bus1Id, userId: customerId,
        seats: JSON.stringify([5, 6]),
        passengerName: "Nguyễn Thị Hoa", passengerPhone: "0908776655", passengerEmail: "hoa.nguyen@gmail.com",
        ticketCode: "NXPN-2026-777666",
        boardingStop: "Hồ Chí Minh", alightingStop: "Bảo Lộc",
        voucherCode: "", discountAmount: 0, totalAmount: 360000,
        status: "Boarded", txId: "TXN-777666-ST",
      },
      {
        busId: bus2Id, userId: customerId,
        seats: JSON.stringify([3, 4]),
        passengerName: "Trần Văn Nam", passengerPhone: "0912334455", passengerEmail: "nam.tran@gmail.com",
        ticketCode: "NXPN-2026-555444",
        boardingStop: "Phan Thiết", alightingStop: "Nha Trang",
        voucherCode: "GIAM30K", discountAmount: 30000, totalAmount: 310000,
        status: "Paid", txId: "TXN-555444-ST",
      },
    ];

    for (const bk of bookings) {
      const ex = await pool.request().input("tc", sql.NVarChar, bk.ticketCode)
        .query("SELECT id FROM Bookings WHERE ticketCode = @tc");
      if (ex.recordset.length === 0) {
        // Check for boardingStop / alightingStop columns, add if missing
        try {
          await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM syscolumns WHERE id=OBJECT_ID('Bookings') AND name='boardingStop')
              ALTER TABLE Bookings ADD boardingStop NVARCHAR(255) NULL;
            IF NOT EXISTS (SELECT * FROM syscolumns WHERE id=OBJECT_ID('Bookings') AND name='alightingStop')
              ALTER TABLE Bookings ADD alightingStop NVARCHAR(255) NULL;
          `);
        } catch (_) {}

        const ins = await pool.request()
          .input("busId",          sql.Int,          bk.busId)
          .input("userId",         sql.Int,          bk.userId)
          .input("seats",          sql.NVarChar,     bk.seats)
          .input("passengerName",  sql.NVarChar,     bk.passengerName)
          .input("passengerPhone", sql.NVarChar,     bk.passengerPhone)
          .input("passengerEmail", sql.NVarChar,     bk.passengerEmail)
          .input("ticketCode",     sql.NVarChar,     bk.ticketCode)
          .input("boardingStop",   sql.NVarChar,     bk.boardingStop)
          .input("alightingStop",  sql.NVarChar,     bk.alightingStop)
          .input("voucherCode",    sql.NVarChar,     bk.voucherCode)
          .input("discountAmount", sql.Decimal(10,2),bk.discountAmount)
          .input("totalAmount",    sql.Decimal(10,2),bk.totalAmount)
          .input("status",         sql.NVarChar,     bk.status)
          .input("txId",           sql.NVarChar,     bk.txId)
          .query(`
            INSERT INTO Bookings
              (busId,userId,seats,passengerName,passengerPhone,passengerEmail,
               ticketCode,boardingStop,alightingStop,voucherCode,discountAmount,totalAmount,
               status,paymentMethod,transactionId,boardedAt)
            OUTPUT INSERTED.id
            VALUES
              (@busId,@userId,@seats,@passengerName,@passengerPhone,@passengerEmail,
               @ticketCode,@boardingStop,@alightingStop,@voucherCode,@discountAmount,@totalAmount,
               @status,'Online',@txId,${bk.status === "Boarded" ? "GETDATE()" : "NULL"})
          `);
        const newId = ins.recordset[0].id;

        await pool.request()
          .input("txId",    sql.NVarChar,     bk.txId)
          .input("bookingId",sql.Int,         newId)
          .input("userId",   sql.Int,         bk.userId)
          .input("amount",   sql.Decimal(10,2),bk.totalAmount)
          .query(`
            INSERT INTO Transactions (transactionId,bookingId,userId,amount,paymentMethod,status)
            VALUES (@txId,@bookingId,@userId,@amount,'Online','Success')
          `);

        console.log(`  + Booking: ${bk.ticketCode} [${bk.boardingStop} → ${bk.alightingStop}] (${bk.status})`);
      }
    }

    console.log("\n✅ Seeding completed!");
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    if (pool) await pool.close().catch(() => {});
    process.exit(1);
  }
}

seedData();
