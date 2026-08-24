require("dotenv").config();
const sql = require("mssql/msnodesqlv8");

const server = process.env.DB_SERVER || "localhost";
const dbName = process.env.DB_DATABASE || "NhaXePhuongNam";
const cfg = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${dbName};Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
};

async function addDriverColumns() {
  try {
    const pool = await sql.connect(cfg);
    console.log("Connected to", dbName);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'driverId')
      BEGIN
        ALTER TABLE Buses ADD driverId INT NULL;
        PRINT 'Added driverId to Buses';
      END;

      IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('Buses') AND name = 'driverName')
      BEGIN
        ALTER TABLE Buses ADD driverName NVARCHAR(255) NULL;
        PRINT 'Added driverName to Buses';
      END;
    `);

    // Assign sample bus 1 to tài xế user (taixe@phuongnam.vn)
    const taixeUser = await pool.request().query("SELECT id, name FROM Users WHERE email = 'taixe@phuongnam.vn'");
    if (taixeUser.recordset.length > 0) {
      const u = taixeUser.recordset[0];
      await pool.request()
        .input("driverId", sql.Int, u.id)
        .input("driverName", sql.NVarChar, u.name)
        .query(`
          UPDATE Buses SET driverId = @driverId, driverName = @driverName WHERE number = '51B-888.88'
        `);
      console.log(`Assigned bus 51B-888.88 to driver: ${u.name} (ID: ${u.id})`);
    }

    // Assign sample bus 2 to phụ xe user (phuxe@phuongnam.vn)
    const phuxeUser = await pool.request().query("SELECT id, name FROM Users WHERE email = 'phuxe@phuongnam.vn'");
    if (phuxeUser.recordset.length > 0) {
      const u = phuxeUser.recordset[0];
      await pool.request()
        .input("driverId", sql.Int, u.id)
        .input("driverName", sql.NVarChar, u.name)
        .query(`
          UPDATE Buses SET driverId = @driverId, driverName = @driverName WHERE number = '51B-999.99'
        `);
      console.log(`Assigned bus 51B-999.99 to staff: ${u.name} (ID: ${u.id})`);
    }

    console.log("Migration complete!");
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
}

addDriverColumns();
