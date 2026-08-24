require("dotenv").config();
const sql = require("mssql/msnodesqlv8");
const server = process.env.DB_SERVER || "localhost";
const dbName = process.env.DB_DATABASE || "NhaXePhuongNam";
const cfg = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${dbName};Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
};

sql.connect(cfg).then(async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM syscolumns 
      WHERE id = OBJECT_ID('Buses') AND name = 'stops'
    )
    BEGIN
      ALTER TABLE Buses ADD stops NVARCHAR(MAX) NULL;
      PRINT 'stops column added.';
    END
    ELSE
      PRINT 'stops column already exists.';
  `);
  console.log("Migration complete: stops column ready.");
  await pool.close();
  process.exit(0);
}).catch((e) => {
  console.error("Migration error:", e.message);
  process.exit(1);
});
