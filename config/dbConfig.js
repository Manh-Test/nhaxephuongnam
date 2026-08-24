const sql = require("mssql/msnodesqlv8");

const server = process.env.DB_SERVER || "localhost";
const database = process.env.DB_DATABASE || "NhaXePhuongNam";

const dbConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;`,
  driver: "msnodesqlv8",
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log("SQL Server Connection Successful");
    return pool;
  } catch (error) {
    console.error("SQL Server Connection Failed:", error.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return pool;
};

module.exports = { connectDB, getPool, sql };
