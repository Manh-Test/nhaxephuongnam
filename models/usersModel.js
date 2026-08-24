const { getPool, sql } = require("../config/dbConfig");

function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    password: row.password,
    role: row.role || (row.isAdmin ? "Admin" : "Customer"),
    isAdmin: !!row.isAdmin,
    isBlocked: !!row.isBlocked,
    failedLoginAttempts: row.failedLoginAttempts || 0,
    lockUntil: row.lockUntil || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const User = {
  async findOne(filter) {
    const pool = getPool();
    const request = pool.request();
    let where = [];
    if (filter.email !== undefined) {
      request.input("email", sql.NVarChar, filter.email);
      where.push("email = @email");
    }
    if (filter.phone !== undefined) {
      request.input("phone", sql.NVarChar, filter.phone);
      where.push("phone = @phone");
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
    const query = `SELECT * FROM Users WHERE ${where.join(" AND ")}`;
    const result = await request.query(query);
    return mapUser(result.recordset[0]);
  },

  async findById(id) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Users WHERE id = @id");
    return mapUser(result.recordset[0]);
  },

  async find() {
    const pool = getPool();
    const result = await pool.request().query("SELECT * FROM Users ORDER BY id DESC");
    return result.recordset.map(mapUser);
  },

  async create(data) {
    const pool = getPool();
    const role = data.role || (data.isAdmin ? "Admin" : "Customer");
    const isAdmin = role === "Admin" || !!data.isAdmin;
    const result = await pool
      .request()
      .input("name", sql.NVarChar, data.name)
      .input("email", sql.NVarChar, data.email)
      .input("phone", sql.NVarChar, data.phone || "")
      .input("password", sql.NVarChar, data.password)
      .input("role", sql.NVarChar, role)
      .input("isAdmin", sql.Bit, isAdmin ? 1 : 0)
      .input("isBlocked", sql.Bit, data.isBlocked ? 1 : 0).query(`
        INSERT INTO Users (name, email, phone, password, role, isAdmin, isBlocked)
        OUTPUT INSERTED.*
        VALUES (@name, @email, @phone, @password, @role, @isAdmin, @isBlocked)
      `);
    return mapUser(result.recordset[0]);
  },

  async findByIdAndUpdate(id, data) {
    const pool = getPool();
    const request = pool.request().input("id", sql.Int, id);
    const sets = [];
    if (data.name !== undefined) {
      request.input("name", sql.NVarChar, data.name);
      sets.push("name = @name");
    }
    if (data.email !== undefined) {
      request.input("email", sql.NVarChar, data.email);
      sets.push("email = @email");
    }
    if (data.phone !== undefined) {
      request.input("phone", sql.NVarChar, data.phone);
      sets.push("phone = @phone");
    }
    if (data.password !== undefined) {
      request.input("password", sql.NVarChar, data.password);
      sets.push("password = @password");
    }
    if (data.role !== undefined) {
      request.input("role", sql.NVarChar, data.role);
      sets.push("role = @role");
      const isAdmin = data.role === "Admin";
      request.input("isAdmin", sql.Bit, isAdmin ? 1 : 0);
      sets.push("isAdmin = @isAdmin");
    } else if (data.isAdmin !== undefined) {
      request.input("isAdmin", sql.Bit, data.isAdmin ? 1 : 0);
      sets.push("isAdmin = @isAdmin");
      if (data.isAdmin) {
        sets.push("role = 'Admin'");
      }
    }
    if (data.isBlocked !== undefined) {
      request.input("isBlocked", sql.Bit, data.isBlocked ? 1 : 0);
      sets.push("isBlocked = @isBlocked");
    }
    if (data.failedLoginAttempts !== undefined) {
      request.input("failedLoginAttempts", sql.Int, data.failedLoginAttempts);
      sets.push("failedLoginAttempts = @failedLoginAttempts");
    }
    if (data.lockUntil !== undefined) {
      request.input("lockUntil", sql.DateTime, data.lockUntil);
      sets.push("lockUntil = @lockUntil");
    }
    sets.push("updatedAt = GETDATE()");
    if (sets.length === 0) return;
    await request.query(`UPDATE Users SET ${sets.join(", ")} WHERE id = @id`);
  },

  async recordFailedLogin(id, currentAttempts) {
    const pool = getPool();
    const newAttempts = currentAttempts + 1;
    if (newAttempts >= 3) {
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("attempts", sql.Int, newAttempts)
        .query(`
          UPDATE Users 
          SET failedLoginAttempts = @attempts, 
              lockUntil = DATEADD(minute, 15, GETDATE()), 
              updatedAt = GETDATE() 
          WHERE id = @id
        `);
    } else {
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("attempts", sql.Int, newAttempts)
        .query(`
          UPDATE Users 
          SET failedLoginAttempts = @attempts, 
              updatedAt = GETDATE() 
          WHERE id = @id
        `);
    }
  },

  async resetFailedAttempts(id) {
    const pool = getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE Users 
        SET failedLoginAttempts = 0, 
            lockUntil = NULL, 
            updatedAt = GETDATE() 
        WHERE id = @id
      `);
  },

  async findByIdAndDelete(id) {
    const pool = getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Users WHERE id = @id");
  },
};

module.exports = User;
