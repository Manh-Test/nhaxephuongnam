import React from "react";
import { Form, message, Alert } from "antd";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import "../resourses/auth.css";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = React.useState("");

  const onFinish = async (values) => {
    try {
      setErrorMessage("");
      dispatch(ShowLoading());
      const response = await axios.post("/api/users/login", values);
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        localStorage.setItem("token", response.data.data.token);
        
        // Redirect based on role
        const role = response.data.data.user?.role;
        if (role === "Staff") {
          window.location.href = "/staff/scan-ticket";
        } else if (role === "Admin") {
          window.location.href = "/admin/buses";
        } else {
          window.location.href = "/";
        }
      } else {
        setErrorMessage(response.data.message);
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      const msg = error.response?.data?.message || error.message;
      setErrorMessage(msg);
      message.error(msg);
    }
  };

  return (
    <div className="h-screen d-flex justify-content-center align-items-center auth">
      <div className="w-400 card p-4 shadow-sm" style={{ borderRadius: 12 }}>
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-primary mb-1">Nha Xe Phuong Nam</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>Hệ thống đặt vé & Quản lý xe trực tuyến</p>
        </div>
        <hr />

        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            className="mb-3"
            style={{ borderRadius: 8 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email hoặc Số điện thoại"
            name="email"
            rules={[{ required: true, message: "Vui lòng nhập Email hoặc SĐT!" }]}
          >
            <input type="text" placeholder="Nhập email hoặc số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <input type="password" placeholder="Nhập mật khẩu" />
          </Form.Item>

          <div className="d-flex justify-content-between align-items-center my-3">
            <Link to="/register" style={{ fontSize: 13 }}>Chưa có tài khoản? Đăng ký ngay</Link>
            <button className="primary-btn" type="submit" style={{ padding: "8px 24px" }}>
              Đăng nhập
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Login;
