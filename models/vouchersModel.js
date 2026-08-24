const { getPool, sql } = require("../config/dbConfig");

function mapVoucher(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    code: row.code,
    discountPercent: row.discountPercent || 0,
    discountAmount: Number(row.discountAmount) || 0,
    minOrderAmount: Number(row.minOrderAmount) || 0,
    maxUsage: row.maxUsage || 100,
    usedCount: row.usedCount || 0,
    expiryDate: row.expiryDate,
    isActive: !!row.isActive,
    createdAt: row.createdAt,
  };
}

const Voucher = {
  async findOne(filter) {
    const pool = getPool();
    const request = pool.request();
    const where = [];
    if (filter.code !== undefined) {
      request.input("code", sql.NVarChar, filter.code.toUpperCase().trim());
      where.push("code = @code");
    }
    if (filter.id !== undefined) {
      request.input("id", sql.Int, filter.id);
      where.push("id = @id");
    }
    if (where.length === 0) return null;
    const result = await request.query(`SELECT * FROM Vouchers WHERE ${where.join(" AND ")}`);
    return mapVoucher(result.recordset[0]);
  },

  async find() {
    const pool = getPool();
    const result = await pool.request().query("SELECT * FROM Vouchers ORDER BY id DESC");
    return result.recordset.map(mapVoucher);
  },

  async create(data) {
    const pool = getPool();
    const result = await pool
      .request()
      .input("code", sql.NVarChar, data.code.toUpperCase().trim())
      .input("discountPercent", sql.Int, data.discountPercent || 0)
      .input("discountAmount", sql.Decimal(10, 2), data.discountAmount || 0)
      .input("minOrderAmount", sql.Decimal(10, 2), data.minOrderAmount || 0)
      .input("maxUsage", sql.Int, data.maxUsage || 100)
      .input("expiryDate", sql.DateTime, new Date(data.expiryDate))
      .input("isActive", sql.Bit, data.isActive !== false ? 1 : 0)
      .query(`
        INSERT INTO Vouchers (code, discountPercent, discountAmount, minOrderAmount, maxUsage, usedCount, expiryDate, isActive)
        OUTPUT INSERTED.*
        VALUES (@code, @discountPercent, @discountAmount, @minOrderAmount, @maxUsage, 0, @expiryDate, @isActive)
      `);
    return mapVoucher(result.recordset[0]);
  },

  async findByIdAndUpdate(id, data) {
    const pool = getPool();
    const request = pool.request().input("id", sql.Int, id);
    const sets = [];
    if (data.code !== undefined) {
      request.input("code", sql.NVarChar, data.code.toUpperCase().trim());
      sets.push("code = @code");
    }
    if (data.discountPercent !== undefined) {
      request.input("discountPercent", sql.Int, data.discountPercent);
      sets.push("discountPercent = @discountPercent");
    }
    if (data.discountAmount !== undefined) {
      request.input("discountAmount", sql.Decimal(10, 2), data.discountAmount);
      sets.push("discountAmount = @discountAmount");
    }
    if (data.minOrderAmount !== undefined) {
      request.input("minOrderAmount", sql.Decimal(10, 2), data.minOrderAmount);
      sets.push("minOrderAmount = @minOrderAmount");
    }
    if (data.maxUsage !== undefined) {
      request.input("maxUsage", sql.Int, data.maxUsage);
      sets.push("maxUsage = @maxUsage");
    }
    if (data.expiryDate !== undefined) {
      request.input("expiryDate", sql.DateTime, new Date(data.expiryDate));
      sets.push("expiryDate = @expiryDate");
    }
    if (data.isActive !== undefined) {
      request.input("isActive", sql.Bit, data.isActive ? 1 : 0);
      sets.push("isActive = @isActive");
    }
    if (sets.length === 0) return;
    await request.query(`UPDATE Vouchers SET ${sets.join(", ")} WHERE id = @id`);
  },

  async incrementUsage(code) {
    const pool = getPool();
    await pool
      .request()
      .input("code", sql.NVarChar, code.toUpperCase().trim())
      .query("UPDATE Vouchers SET usedCount = usedCount + 1 WHERE code = @code");
  },

  async findByIdAndDelete(id) {
    const pool = getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Vouchers WHERE id = @id");
  },

  // Validate discount code for an order amount
  async validateVoucher(code, orderAmount) {
    const voucher = await this.findOne({ code });
    if (!voucher) {
      return { valid: false, message: "Mã giảm giá không tồn tại." };
    }
    if (!voucher.isActive) {
      return { valid: false, message: "Mã giảm giá hiện đang bị vô hiệu hóa." };
    }
    if (new Date(voucher.expiryDate) < new Date()) {
      return { valid: false, message: "Mã giảm giá đã hết hạn sử dụng." };
    }
    if (voucher.usedCount >= voucher.maxUsage) {
      return { valid: false, message: "Mã giảm giá đã hết lượt sử dụng." };
    }
    if (orderAmount < voucher.minOrderAmount) {
      return {
        valid: false,
        message: `Đơn hàng chưa đạt mức tối thiểu ${voucher.minOrderAmount.toLocaleString()} VNĐ để dùng mã này.`,
      };
    }

    let calculatedDiscount = 0;
    if (voucher.discountPercent > 0) {
      calculatedDiscount = Math.round((orderAmount * voucher.discountPercent) / 100);
    } else if (voucher.discountAmount > 0) {
      calculatedDiscount = voucher.discountAmount;
    }
    calculatedDiscount = Math.min(calculatedDiscount, orderAmount);

    return {
      valid: true,
      voucher,
      discountAmount: calculatedDiscount,
      finalAmount: Math.max(0, orderAmount - calculatedDiscount),
      message: `Áp dụng thành công! Giảm ${calculatedDiscount.toLocaleString()} VNĐ.`,
    };
  },
};

module.exports = Voucher;
