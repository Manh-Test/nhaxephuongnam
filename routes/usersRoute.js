const router = require("express").Router();
const User = require("../models/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");

// ── Register new user (Customer) ──────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.send({
        message: "Email đã được sử dụng. Vui lòng chọn email khác.",
        success: false,
        data: null,
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || "",
      password: hashedPassword,
      role: req.body.role || "Customer",
      isAdmin: req.body.role === "Admin" || !!req.body.isAdmin,
    });
    res.send({
      message: "Đăng ký tài khoản thành công!",
      success: true,
      data: null,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Login user (Customer / Staff / Admin with Security Lockout) ───────────
router.post("/login", async (req, res) => {
  try {
    const identifier = req.body.email || req.body.phone;
    let userExists = await User.findOne({ email: identifier });
    if (!userExists) {
      userExists = await User.findOne({ phone: identifier });
    }

    if (!userExists) {
      return res.send({
        message: "Tài khoản không tồn tại trên hệ thống.",
        success: false,
        data: null,
      });
    }

    if (userExists.isBlocked) {
      return res.send({
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        success: false,
        data: null,
      });
    }

    // Check 15-minute lockout if failed >= 3 times
    if (userExists.lockUntil) {
      const lockTime = new Date(userExists.lockUntil).getTime();
      const now = new Date().getTime();
      if (now < lockTime) {
        const remainingMins = Math.ceil((lockTime - now) / (60 * 1000));
        return res.send({
          message: `Tài khoản tạm thời bị khóa do nhập sai mật khẩu 3 lần. Vui lòng thử lại sau ${remainingMins} phút.`,
          success: false,
          data: null,
        });
      } else {
        // Lockout expired, reset counter
        await User.resetFailedAttempts(userExists.id);
        userExists.failedLoginAttempts = 0;
      }
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      userExists.password
    );

    if (!passwordMatch) {
      const currentAttempts = userExists.failedLoginAttempts || 0;
      await User.recordFailedLogin(userExists.id, currentAttempts);
      const remainingTries = 2 - currentAttempts;
      if (remainingTries <= 0) {
        return res.send({
          message: "Sai mật khẩu 3 lần liên tiếp. Tài khoản đã bị tạm khóa trong 15 phút để đảm bảo an toàn.",
          success: false,
          data: null,
        });
      } else {
        return res.send({
          message: `Mật khẩu không chính xác! Bạn còn ${remainingTries} lần thử trước khi tài khoản bị tạm khóa.`,
          success: false,
          data: null,
        });
      }
    }

    // Reset failed login counter on successful login
    await User.resetFailedAttempts(userExists.id);

    const token = jwt.sign(
      {
        userId: userExists.id,
        role: userExists.role || (userExists.isAdmin ? "Admin" : "Customer"),
      },
      process.env.jwt_secret,
      { expiresIn: "1d" }
    );

    res.send({
      message: "Đăng nhập thành công!",
      success: true,
      data: {
        token,
        user: {
          id: userExists.id,
          _id: userExists.id,
          name: userExists.name,
          email: userExists.email,
          phone: userExists.phone,
          role: userExists.role || (userExists.isAdmin ? "Admin" : "Customer"),
          isAdmin: userExists.role === "Admin" || userExists.isAdmin,
        },
      },
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Get user by id ─────────────────────────────────────────────────────────
router.post("/get-user-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.send({
        message: "Không tìm thấy người dùng",
        success: false,
        data: null,
      });
    }
    res.send({
      message: "Lấy thông tin người dùng thành công",
      success: true,
      data: user,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Get all users (Admin) ──────────────────────────────────────────────────
router.post("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.send({
      message: "Lấy danh sách người dùng thành công",
      success: true,
      data: users,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Create user / Staff (Admin) ───────────────────────────────────────────
router.post("/add-user", authMiddleware, async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.send({
        message: "Email đã tồn tại",
        success: false,
        data: null,
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password || "123456", 10);
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || "",
      password: hashedPassword,
      role: req.body.role || "Staff",
      isAdmin: req.body.role === "Admin",
      isBlocked: !!req.body.isBlocked,
    });
    res.send({
      message: "Tạo tài khoản thành công!",
      success: true,
      data: newUser,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Update user permissions / role / block (Admin) ─────────────────────────
router.post("/update-user-permissions", authMiddleware, async (req, res) => {
  try {
    const targetId = req.body._id || req.body.id;
    await User.findByIdAndUpdate(targetId, req.body);
    res.send({
      message: "Cập nhật quyền và trạng thái người dùng thành công",
      success: true,
      data: null,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// ── Delete user (Admin) ───────────────────────────────────────────────────
router.post("/delete-user", authMiddleware, async (req, res) => {
  try {
    const targetId = req.body._id || req.body.id;
    await User.findByIdAndDelete(targetId);
    res.send({
      message: "Xóa người dùng thành công",
      success: true,
      data: null,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

module.exports = router;
