const express = require("express");
const app = express();
require("dotenv").config();
const { connectDB } = require("./config/dbConfig");
const port = process.env.PORT || 5001;
app.use(express.json());

const usersRoute = require("./routes/usersRoute");
const busesRoute = require("./routes/busesRoute");
const bookingsRoute = require("./routes/bookingsRoute");
const vouchersRoute = require("./routes/vouchersRoute");
const transactionsRoute = require("./routes/transactionsRoute");

app.use("/api/users", usersRoute);
app.use("/api/buses", busesRoute);
app.use("/api/bookings", bookingsRoute);
app.use("/api/vouchers", vouchersRoute);
app.use("/api/transactions", transactionsRoute);

const path = require("path");
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/build/index.html"));
  });
}

// Connect to SQL Server first, then initialize tables and start listening
connectDB().then(async () => {
  const SeatLock = require("./models/seatLockModel");
  await SeatLock.initTable().catch(() => {});
  
  app.listen(port, () =>
    console.log(`Nha Xe Phuong Nam server listening on port ${port}!`)
  );
});
