/**
 * initDb.js — Run once to create or migrate the SQL Server database and all tables.
 * Usage: node config/initDb.js
 */
require("dotenv").config();
const sql = require("mssql/msnodesqlv8");

const server = process.env.DB_SERVER || "localhost";
const dbName = process.env.DB_DATABASE || "NhaXePhuongNam";

const masterConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=master;Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
};

async function initDb() {
  let masterPool;
  try {
    // ── 1. Connect to master and create the database if it doesn't exist ──
    masterPool = await sql.connect(masterConfig);
    console.log("Connected to master database.");

    await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
      BEGIN
        CREATE DATABASE [${dbName}];
        PRINT 'Database ${dbName} created.';
      END
      ELSE
        PRINT 'Database ${dbName} already exists.';
    `);

    await masterPool.close();

    // ── 2. Connect to the target database and create / alter tables ──
    const dbPool = await sql.connect({
      connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${dbName};Trusted_Connection=yes;`,
      driver: "msnodesqlv8",
    });
    console.log(`Connected to ${dbName}.`);

    // ── Users table ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      BEGIN
        CREATE TABLE Users (
          id                  INT IDENTITY(1,1) PRIMARY KEY,
          name                NVARCHAR(255)  NOT NULL,
          email               NVARCHAR(255)  NOT NULL UNIQUE,
          phone               NVARCHAR(50)   NULL,
          password            NVARCHAR(255)  NOT NULL,
          role                NVARCHAR(50)   NOT NULL DEFAULT 'Customer', -- 'Customer', 'Staff', 'Admin'
          isAdmin             BIT            NOT NULL DEFAULT 0,
          isBlocked           BIT            NOT NULL DEFAULT 0,
          failedLoginAttempts INT            NOT NULL DEFAULT 0,
          lockUntil           DATETIME       NULL,
          createdAt           DATETIME       NOT NULL DEFAULT GETDATE(),
          updatedAt           DATETIME       NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Users created.';
      END
      ELSE
      BEGIN
        -- Add columns if missing
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Users') AND name = 'phone')
          ALTER TABLE Users ADD phone NVARCHAR(50) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Users') AND name = 'role')
          ALTER TABLE Users ADD role NVARCHAR(50) NOT NULL DEFAULT 'Customer';
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Users') AND name = 'failedLoginAttempts')
          ALTER TABLE Users ADD failedLoginAttempts INT NOT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Users') AND name = 'lockUntil')
          ALTER TABLE Users ADD lockUntil DATETIME NULL;
        PRINT 'Table Users updated with new columns.';
      END
    `);

    // ── Buses table ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Buses' AND xtype='U')
      BEGIN
        CREATE TABLE Buses (
          id               INT IDENTITY(1,1) PRIMARY KEY,
          name             NVARCHAR(255)     NOT NULL,
          number           NVARCHAR(100)     NOT NULL UNIQUE,
          capacity         INT               NOT NULL,
          fromCity         NVARCHAR(255)     NOT NULL,
          toCity           NVARCHAR(255)     NOT NULL,
          journeyDate      NVARCHAR(50)      NOT NULL,
          departure        NVARCHAR(50)      NOT NULL,
          arrival          NVARCHAR(50)      NOT NULL,
          type             NVARCHAR(100)     NOT NULL,
          fare             DECIMAL(10,2)     NOT NULL,
          seatsBooked      NVARCHAR(MAX)     NOT NULL DEFAULT '[]',
          status           NVARCHAR(100)     NOT NULL DEFAULT 'Yet To Start',
          currentLatitude  FLOAT             NULL,
          currentLongitude FLOAT             NULL,
          lastGpsUpdate    DATETIME          NULL
        );
        PRINT 'Table Buses created.';
      END
      ELSE
      BEGIN
        -- Add GPS columns if missing
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'currentLatitude')
          ALTER TABLE Buses ADD currentLatitude FLOAT NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'currentLongitude')
          ALTER TABLE Buses ADD currentLongitude FLOAT NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'lastGpsUpdate')
          ALTER TABLE Buses ADD lastGpsUpdate DATETIME NULL;
        PRINT 'Table Buses updated with GPS columns.';
      END
    `);

    // ── Vouchers table ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vouchers' AND xtype='U')
      BEGIN
        CREATE TABLE Vouchers (
          id              INT IDENTITY(1,1) PRIMARY KEY,
          code            NVARCHAR(50)      NOT NULL UNIQUE,
          discountPercent INT               NULL DEFAULT 0,
          discountAmount  DECIMAL(10,2)     NULL DEFAULT 0,
          minOrderAmount  DECIMAL(10,2)     NULL DEFAULT 0,
          maxUsage        INT               NOT NULL DEFAULT 100,
          usedCount       INT               NOT NULL DEFAULT 0,
          expiryDate      DATETIME          NOT NULL,
          isActive        BIT               NOT NULL DEFAULT 1,
          createdAt       DATETIME          NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Vouchers created.';
      END
      ELSE
        PRINT 'Table Vouchers already exists.';
    `);

    // ── Bookings table ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Bookings' AND xtype='U')
      BEGIN
        CREATE TABLE Bookings (
          id              INT IDENTITY(1,1) PRIMARY KEY,
          busId           INT               NOT NULL REFERENCES Buses(id),
          userId          INT               NOT NULL REFERENCES Users(id),
          seats           NVARCHAR(MAX)     NOT NULL,
          passengerName   NVARCHAR(255)     NULL,
          passengerPhone  NVARCHAR(50)      NULL,
          passengerEmail  NVARCHAR(255)     NULL,
          ticketCode      NVARCHAR(100)     NULL,
          voucherCode     NVARCHAR(50)      NULL,
          discountAmount  DECIMAL(10,2)     NOT NULL DEFAULT 0,
          totalAmount     DECIMAL(10,2)     NOT NULL DEFAULT 0,
          status          NVARCHAR(50)      NOT NULL DEFAULT 'Paid', -- 'Paid', 'Cancelled', 'Boarded'
          boardedAt       DATETIME          NULL,
          paymentMethod   NVARCHAR(50)      NOT NULL DEFAULT 'Online',
          transactionId   NVARCHAR(255)     NOT NULL,
          createdAt       DATETIME          NOT NULL DEFAULT GETDATE(),
          updatedAt       DATETIME          NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Bookings created.';
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'passengerName')
          ALTER TABLE Bookings ADD passengerName NVARCHAR(255) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'passengerPhone')
          ALTER TABLE Bookings ADD passengerPhone NVARCHAR(50) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'passengerEmail')
          ALTER TABLE Bookings ADD passengerEmail NVARCHAR(255) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'ticketCode')
          ALTER TABLE Bookings ADD ticketCode NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'voucherCode')
          ALTER TABLE Bookings ADD voucherCode NVARCHAR(50) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'discountAmount')
          ALTER TABLE Bookings ADD discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'totalAmount')
          ALTER TABLE Bookings ADD totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'status')
          ALTER TABLE Bookings ADD status NVARCHAR(50) NOT NULL DEFAULT 'Paid';
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'boardingStop')
          ALTER TABLE Bookings ADD boardingStop NVARCHAR(255) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'alightingStop')
          ALTER TABLE Bookings ADD alightingStop NVARCHAR(255) NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'boardedAt')
          ALTER TABLE Bookings ADD boardedAt DATETIME NULL;
        IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'paymentMethod')
          ALTER TABLE Bookings ADD paymentMethod NVARCHAR(50) NOT NULL DEFAULT 'Online';
        PRINT 'Table Bookings updated with new columns.';
      END
    `);

    // ── Transactions table ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Transactions' AND xtype='U')
      BEGIN
        CREATE TABLE Transactions (
          id            INT IDENTITY(1,1) PRIMARY KEY,
          transactionId NVARCHAR(255)     NOT NULL,
          bookingId     INT               NULL REFERENCES Bookings(id),
          userId        INT               NOT NULL REFERENCES Users(id),
          amount        DECIMAL(10,2)     NOT NULL,
          paymentMethod NVARCHAR(50)      NOT NULL DEFAULT 'Stripe',
          status        NVARCHAR(50)      NOT NULL DEFAULT 'Success', -- 'Success', 'Failed', 'Refunded'
          createdAt     DATETIME          NOT NULL DEFAULT GETDATE()
        );
        PRINT 'Table Transactions created.';
      END
      ELSE
        PRINT 'Table Transactions already exists.';
    `);

    // ── Seed initial sample vouchers if none exist ──
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM Vouchers WHERE code = 'PHUONGNAM10')
      BEGIN
        INSERT INTO Vouchers (code, discountPercent, discountAmount, minOrderAmount, maxUsage, usedCount, expiryDate, isActive)
        VALUES ('PHUONGNAM10', 10, 0, 100000, 500, 0, DATEADD(month, 6, GETDATE()), 1);
      END
      IF NOT EXISTS (SELECT * FROM Vouchers WHERE code = 'GIAM30K')
      BEGIN
        INSERT INTO Vouchers (code, discountPercent, discountAmount, minOrderAmount, maxUsage, usedCount, expiryDate, isActive)
        VALUES ('GIAM30K', 0, 30000, 150000, 300, 0, DATEADD(month, 3, GETDATE()), 1);
      END
      IF NOT EXISTS (SELECT * FROM Vouchers WHERE code = 'WELCOME')
      BEGIN
        INSERT INTO Vouchers (code, discountPercent, discountAmount, minOrderAmount, maxUsage, usedCount, expiryDate, isActive)
        VALUES ('WELCOME', 15, 0, 50000, 1000, 0, DATEADD(year, 1, GETDATE()), 1);
      END
    `);
    console.log("Sample vouchers seeded.");

    console.log("✅ Database schema migration complete.");
    await dbPool.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Init failed:", error.message || JSON.stringify(error));
    if (masterPool) await masterPool.close().catch(() => {});
    process.exit(1);
  }
}

initDb();
