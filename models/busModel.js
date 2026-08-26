const { getPool, sql } = require("../config/dbConfig");

// Fallback GPS coordinates for common Vietnamese cities
const CITY_COORDS = {
  "Hồ Chí Minh": { lat: 10.7769, lng: 106.7009 },
  "Cần Thơ":     { lat: 10.0452, lng: 105.7469 },
  "Đà Lạt":      { lat: 11.9404, lng: 108.4583 },
  "Nha Trang":   { lat: 12.2388, lng: 109.1967 },
  "Vũng Tàu":   { lat: 10.3460, lng: 107.0843 },
  "Đà Nẵng":    { lat: 16.0544, lng: 108.2022 },
  "Hà Nội":     { lat: 21.0285, lng: 105.8542 },
  "Huế":         { lat: 16.4637, lng: 107.5909 },
  "Phan Thiết":  { lat: 10.9289, lng: 108.1022 },
  "Buôn Ma Thuột": { lat: 12.6667, lng: 108.0500 },
  "Quy Nhơn":   { lat: 13.7830, lng: 109.2197 },
};

function normalizeStr(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseStops(raw) {
  try {
    if (!raw) return [];
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch {
    return [];
  }
}

function mapRow(row) {
  if (!row) return null;
  const booked   = parseStops(row.seatsBooked || "[]");
  const stops    = parseStops(row.stops || "[]");
  const capacity = Number(row.capacity) || 0;
  const availableSeats = Math.max(0, capacity - booked.length);

  // Derive fromCity / toCity from stops if available
  const fromCity = stops.length > 0 ? stops[0].name : (row.fromCity || "");
  const toCity   = stops.length > 0 ? stops[stops.length - 1].name : (row.toCity || "");

  // Fallback GPS from first stop city
  let lat = row.currentLatitude;
  let lng = row.currentLongitude;
  if (lat == null || lng == null) {
    const loc = CITY_COORDS[fromCity] || { lat: 10.7769, lng: 106.7009 };
    lat = loc.lat;
    lng = loc.lng;
  }

  return {
    _id:            row.id,
    id:             row.id,
    name:           row.name,
    number:         row.number,
    capacity:       capacity,
    from:           fromCity,
    to:             toCity,
    fromCity:       fromCity,
    toCity:         toCity,
    stops:          stops,
    journeyDate:    row.journeyDate,
    departure:      row.departure,
    arrival:        row.arrival,
    type:           row.type,
    fare:           Number(row.fare),
    seatsBooked:    booked,
    availableSeats: availableSeats,
    status:         row.status,
    currentLatitude:  lat,
    currentLongitude: lng,
    lastGpsUpdate:  row.lastGpsUpdate,
    driverId:       row.driverId || null,
    driverName:     row.driverName || null,
  };
}

const Bus = {
  async findOne(filter) {
    const pool    = getPool();
    const request = pool.request();
    const where   = [];
    if (filter.number !== undefined) {
      request.input("number", sql.NVarChar, filter.number);
      where.push("number = @number");
    }
    if (filter.id !== undefined) {
      request.input("id", sql.Int, filter.id);
      where.push("id = @id");
    }
    if (filter._id !== undefined) {
      request.input("id", sql.Int, filter._id);
      where.push("id = @id");
    }
    if (where.length === 0) return null;
    const result = await request.query(`SELECT * FROM Buses WHERE ${where.join(" AND ")}`);
    return mapRow(result.recordset[0]);
  },

  async findById(id) {
    const pool   = getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Buses WHERE id = @id");
    return mapRow(result.recordset[0]);
  },

  async find(filter = {}) {
    const pool    = getPool();
    const request = pool.request();
    const where   = [];

    if (filter.journeyDate) {
      request.input("journeyDate", sql.NVarChar, filter.journeyDate);
      where.push("journeyDate = @journeyDate");
    }
    if (filter.status) {
      request.input("status", sql.NVarChar, filter.status);
      where.push("status = @status");
    }

    where.push("status <> 'Archived'");
    const whereClause = `WHERE ${where.join(" AND ")}`;
    const result = await request.query(`SELECT * FROM Buses ${whereClause} ORDER BY id DESC`);
    let buses = result.recordset.map(mapRow);

    // Precise Multi-Stop Directional Filtering
    if (filter.from || filter.to) {
      const searchFrom = filter.from ? normalizeStr(filter.from) : "";
      const searchTo   = filter.to   ? normalizeStr(filter.to)   : "";

      buses = buses.filter((bus) => {
        const stops = bus.stops && bus.stops.length >= 2 ? bus.stops : [
          { name: bus.from || "" },
          { name: bus.to || "" }
        ];

        // 1. If searching both From and To: must find fromIndex < toIndex
        if (searchFrom && searchTo) {
          let fromIdx = -1;
          let toIdx   = -1;

          for (let i = 0; i < stops.length; i++) {
            const stopNameNorm = normalizeStr(stops[i].name);
            if (fromIdx === -1 && stopNameNorm.includes(searchFrom)) {
              fromIdx = i;
            }
            if (fromIdx !== -1 && i > fromIdx && stopNameNorm.includes(searchTo)) {
              toIdx = i;
              break;
            }
          }
          return fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
        }

        // 2. If searching only From (Điểm đón / Trạm lên xe):
        // Must match a stop that is NOT the last stop (i.e. index < stops.length - 1)
        if (searchFrom) {
          const hasValidBoardingStop = stops.slice(0, stops.length - 1).some((st) =>
            normalizeStr(st.name).includes(searchFrom)
          );
          return hasValidBoardingStop;
        }

        // 3. If searching only To (Điểm trả / Trạm xuống xe):
        // Must match a stop that is NOT the first stop (i.e. index > 0)
        if (searchTo) {
          const hasValidAlightingStop = stops.slice(1).some((st) =>
            normalizeStr(st.name).includes(searchTo)
          );
          return hasValidAlightingStop;
        }

        return true;
      });
    }

    return buses;
  },

  async create(data) {
    const pool   = getPool();
    const stops  = data.stops || [];
    // Derive fromCity / toCity from stops for backward compat columns
    const fromCity = stops.length > 0 ? stops[0].name : (data.from || "");
    const toCity   = stops.length > 0 ? stops[stops.length - 1].name : (data.to || "");
    // Base fare = fare to first stop (0) — or minimum stop fare, or explicit fare field
    const baseFare = data.fare || (stops.length > 1 ? (stops[stops.length - 1].fare || 0) : 0);

    const result = await pool
      .request()
      .input("name",             sql.NVarChar,     data.name)
      .input("number",           sql.NVarChar,     data.number)
      .input("capacity",         sql.Int,          data.capacity)
      .input("fromCity",         sql.NVarChar,     fromCity)
      .input("toCity",           sql.NVarChar,     toCity)
      .input("journeyDate",      sql.NVarChar,     data.journeyDate)
      .input("departure",        sql.NVarChar,     data.departure)
      .input("arrival",          sql.NVarChar,     data.arrival)
      .input("type",             sql.NVarChar,     data.type)
      .input("fare",             sql.Decimal(10,2),baseFare)
      .input("seatsBooked",      sql.NVarChar,     JSON.stringify(data.seatsBooked || []))
      .input("status",           sql.NVarChar,     data.status || "Yet To Start")
      .input("currentLatitude",  sql.Float,        data.currentLatitude  || null)
      .input("currentLongitude", sql.Float,        data.currentLongitude || null)
      .input("stops",            sql.NVarChar,     JSON.stringify(stops))
      .input("driverId",         sql.Int,          data.driverId || null)
      .input("driverName",       sql.NVarChar,     data.driverName || null)
      .query(`
        INSERT INTO Buses
          (name, number, capacity, fromCity, toCity, journeyDate, departure, arrival,
           type, fare, seatsBooked, status, currentLatitude, currentLongitude, lastGpsUpdate, stops, driverId, driverName)
        OUTPUT INSERTED.*
        VALUES
          (@name, @number, @capacity, @fromCity, @toCity, @journeyDate, @departure, @arrival,
           @type, @fare, @seatsBooked, @status, @currentLatitude, @currentLongitude, GETDATE(), @stops, @driverId, @driverName)
      `);
    return mapRow(result.recordset[0]);
  },

  async findByIdAndUpdate(id, data) {
    const pool    = getPool();
    const request = pool.request().input("id", sql.Int, id);
    const sets    = [];

    const fields = {
      name:        [sql.NVarChar,     data.name],
      number:      [sql.NVarChar,     data.number],
      capacity:    [sql.Int,          data.capacity],
      journeyDate: [sql.NVarChar,     data.journeyDate],
      departure:   [sql.NVarChar,     data.departure],
      arrival:     [sql.NVarChar,     data.arrival],
      type:        [sql.NVarChar,     data.type],
      status:      [sql.NVarChar,     data.status],
      currentLatitude:  [sql.Float,   data.currentLatitude],
      currentLongitude: [sql.Float,   data.currentLongitude],
      driverId:    [sql.Int,          data.driverId !== undefined ? data.driverId : null],
      driverName:  [sql.NVarChar,     data.driverName !== undefined ? data.driverName : null],
    };

    for (const [col, [type, val]] of Object.entries(fields)) {
      if (val !== undefined && val !== null) {
        request.input(col, type, val);
        sets.push(`${col} = @${col}`);
      }
    }

    if (data.seatsBooked !== undefined) {
      request.input("seatsBooked", sql.NVarChar, JSON.stringify(data.seatsBooked));
      sets.push("seatsBooked = @seatsBooked");
    }

    if (data.stops !== undefined) {
      const stops    = Array.isArray(data.stops) ? data.stops : [];
      const fromCity = stops.length > 0 ? stops[0].name : (data.from || "");
      const toCity   = stops.length > 0 ? stops[stops.length - 1].name : (data.to || "");
      const baseFare = stops.length > 1 ? (stops[stops.length - 1].fare || data.fare || 0) : (data.fare || 0);

      request.input("stops",    sql.NVarChar,     JSON.stringify(stops));
      request.input("fromCity", sql.NVarChar,     fromCity);
      request.input("toCity",   sql.NVarChar,     toCity);
      request.input("fare",     sql.Decimal(10,2),baseFare);
      sets.push("stops = @stops", "fromCity = @fromCity", "toCity = @toCity", "fare = @fare");
    } else if (data.fare !== undefined) {
      request.input("fare", sql.Decimal(10,2), data.fare);
      sets.push("fare = @fare");
    }

    if (data.currentLatitude !== undefined || data.currentLongitude !== undefined) {
      sets.push("lastGpsUpdate = GETDATE()");
    }

    if (sets.length === 0) return;
    await request.query(`UPDATE Buses SET ${sets.join(", ")} WHERE id = @id`);
  },

  async updateGps(id, lat, lng) {
    const pool = getPool();
    await pool
      .request()
      .input("id",  sql.Int,   id)
      .input("lat", sql.Float, lat)
      .input("lng", sql.Float, lng)
      .query(`
        UPDATE Buses
        SET currentLatitude  = @lat,
            currentLongitude = @lng,
            lastGpsUpdate    = GETDATE()
        WHERE id = @id
      `);
  },

  async hasBookings(busId) {
    const pool   = getPool();
    const result = await pool
      .request()
      .input("busId", sql.Int, busId)
      .query("SELECT COUNT(*) AS total FROM Bookings WHERE busId = @busId AND status != 'Cancelled'");
    return (result.recordset[0].total || 0) > 0;
  },

  async findByDriverId(driverId) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("driverId", sql.Int, driverId)
      .query("SELECT TOP 1 * FROM Buses WHERE driverId = @driverId ORDER BY id DESC");
    return mapRow(result.recordset[0]);
  },

  async assignDriver(busId, driverId, driverName) {
    const pool = getPool();
    // 1. Clear any existing bus assigned to this driver (only 1 active bus per driver)
    await pool
      .request()
      .input("driverId", sql.Int, driverId)
      .query("UPDATE Buses SET driverId = NULL, driverName = NULL WHERE driverId = @driverId");

    // 2. Assign the chosen bus
    await pool
      .request()
      .input("id", sql.Int, busId)
      .input("driverId", sql.Int, driverId)
      .input("driverName", sql.NVarChar, driverName || "")
      .query("UPDATE Buses SET driverId = @driverId, driverName = @driverName WHERE id = @id");
  },

  async findByIdAndDelete(id) {
    const pool = getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Buses WHERE id = @id");
  },
};

module.exports = Bus;
