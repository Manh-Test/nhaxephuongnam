import React from "react";
import { Form, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { ShowLoading, HideLoading } from "../redux/alertsSlice";
import "../resourses/auth.css";

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onFinish = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await axios.post("/api/users/register", values);
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        navigate("/login");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  return (
    <div className="h-screen d-flex justify-content-center align-items-center auth">
      <div className="w-400 card p-4 shadow-sm" style={{ borderRadius: 12 }}>
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-primary mb-1">Nha Xe Phuong Nam</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>Đăng ký tài khoản khách hàng mới</p>
        </div>
        <hr />
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <input type="text" placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
          >
            <input type="text" placeholder="0901234567" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không đúng định dạng!" },
            ]}
          >
            <input type="email" placeholder="example@gmail.com" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <input type="password" placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <div className="d-flex justify-content-between align-items-center my-3">
            <Link to="/login" style={{ fontSize: 13 }}>Đã có tài khoản? Đăng nhập</Link>
            <button className="primary-btn" type="submit" style={{ padding: "8px 24px" }}>
              Đăng ký
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Register;
