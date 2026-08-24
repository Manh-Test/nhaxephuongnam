require("dotenv").config();
const sql = require("mssql/msnodesqlv8");

const server = process.env.DB_SERVER || "localhost";
const dbName = process.env.DB_DATABASE || "NhaXePhuongNam";
const cfg = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${dbName};Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
};

async function fixSchema() {
  try {
    const pool = await sql.connect(cfg);
    console.log("Connected to", dbName);

    // 1. Ensure Bookings columns
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'boardingStop')
      BEGIN
        ALTER TABLE Bookings ADD boardingStop NVARCHAR(255) NULL;
        PRINT 'Added boardingStop to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'alightingStop')
      BEGIN
        ALTER TABLE Bookings ADD alightingStop NVARCHAR(255) NULL;
        PRINT 'Added alightingStop to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'boardedAt')
      BEGIN
        ALTER TABLE Bookings ADD boardedAt DATETIME NULL;
        PRINT 'Added boardedAt to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'passengerEmail')
      BEGIN
        ALTER TABLE Bookings ADD passengerEmail NVARCHAR(255) NULL;
        PRINT 'Added passengerEmail to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'discountAmount')
      BEGIN
        ALTER TABLE Bookings ADD discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0;
        PRINT 'Added discountAmount to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'totalAmount')
      BEGIN
        ALTER TABLE Bookings ADD totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0;
        PRINT 'Added totalAmount to Bookings';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Bookings') AND name = 'voucherCode')
      BEGIN
        ALTER TABLE Bookings ADD voucherCode NVARCHAR(100) NULL;
        PRINT 'Added voucherCode to Bookings';
      END;
    `);

    // 2. Ensure Buses columns
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'stops')
      BEGIN
        ALTER TABLE Buses ADD stops NVARCHAR(MAX) NULL;
        PRINT 'Added stops to Buses';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'currentLatitude')
      BEGIN
        ALTER TABLE Buses ADD currentLatitude FLOAT NULL;
        PRINT 'Added currentLatitude to Buses';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'currentLongitude')
      BEGIN
        ALTER TABLE Buses ADD currentLongitude FLOAT NULL;
        PRINT 'Added currentLongitude to Buses';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'lastGpsUpdate')
      BEGIN
        ALTER TABLE Buses ADD lastGpsUpdate DATETIME NULL;
        PRINT 'Added lastGpsUpdate to Buses';
      END;
    `);

    const cols = await pool.request().query(`
      SELECT name FROM syscolumns WHERE id = OBJECT_ID('Bookings')
    `);
    console.log("Current Bookings columns:", cols.recordset.map(r => r.name).join(", "));

    console.log("Schema check & update completed successfully!");
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error("Schema error:", err.message);
    process.exit(1);
  }
}

fixSchema();
