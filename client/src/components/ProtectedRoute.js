import { message } from "antd";
import axios from "axios";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import { SetUser } from "../redux/usersSlice";
import DefaultLayout from "./DefaultLayout";

function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.users);
  const navigate = useNavigate();

  const validateToken = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axios.post(
        "/api/users/get-user-by-id",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      dispatch(HideLoading());
      if (response.data.success) {
        dispatch(SetUser(response.data.data));
      } else {
        localStorage.removeItem("token");
        message.error(response.data.message);
        navigate("/login");
      }
    } catch (error) {
      dispatch(HideLoading());
      localStorage.removeItem("token");
      message.error(error.message);
      navigate("/login");
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      validateToken();
    } else {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    if (user) {
      // 1. Block non-admins from /admin routes
      if (window.location.pathname.includes("admin") && !user.isAdmin && user.role !== "Admin") {
        message.error("Bạn không có quyền truy cập trang quản trị này.");
        navigate("/");
      }

      // 2. Staff shouldn't access Home "/" (redirect directly to staff portal)
      if (user.role === "Staff" && window.location.pathname === "/") {
        navigate("/staff/scan-ticket");
      }

      // 3. Admin shouldn't land on Home "/" (redirect to bus management)
      if ((user.role === "Admin" || user.isAdmin) && window.location.pathname === "/") {
        navigate("/admin/buses");
      }
    }
  }, [user, navigate]);

  return (
    <div>{user !== null && <DefaultLayout>{children}</DefaultLayout>}</div>
  );
}

export default ProtectedRoute;
