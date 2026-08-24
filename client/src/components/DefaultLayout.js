import React from "react";
import "../resourses/layout.css";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

function DefaultLayout({ children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const { user } = useSelector((state) => state.users);

  const role = user?.role || (user?.isAdmin ? "Admin" : "Customer");

  const customerMenu = [
    {
      name: "Trang chủ",
      icon: "ri-home-line",
      path: "/",
    },
    {
      name: "Vé của tôi",
      icon: "ri-ticket-line",
      path: "/bookings",
    },
    {
      name: "Theo dõi xe trực tuyến",
      icon: "ri-map-pin-line",
      path: "/tracking",
    },
    {
      name: "Đăng xuất",
      icon: "ri-logout-box-line",
      path: "/logout",
    },
  ];

  // Staff menu (Only QR Scan, GPS/Status Update, Map, and Logout)
  const staffMenu = [
    {
      name: "Soát vé QR / Mã vé",
      icon: "ri-qr-scan-2-line",
      path: "/staff/scan-ticket",
    },
    {
      name: "Cập nhật GPS & Trạng thái xe",
      icon: "ri-navigation-line",
      path: "/staff/gps-update",
    },
    {
      name: "Bản đồ theo dõi xe",
      icon: "ri-map-pin-line",
      path: "/tracking",
    },
    {
      name: "Đăng xuất",
      icon: "ri-logout-box-line",
      path: "/logout",
    },
  ];

  const adminMenu = [
    {
      name: "Quản lý Tuyến xe",
      path: "/admin/buses",
      icon: "ri-bus-line",
    },
    {
      name: "Quản lý Tài khoản",
      path: "/admin/users",
      icon: "ri-user-line",
    },
    {
      name: "Mã giảm giá",
      path: "/admin/vouchers",
      icon: "ri-coupon-line",
    },
    {
      name: "Nhật ký & Đối soát",
      path: "/admin/transactions",
      icon: "ri-exchange-dollar-line",
    },
    {
      name: "Đăng xuất",
      path: "/logout",
      icon: "ri-logout-box-line",
    },
  ];

  let menuToBeRendered = customerMenu;
  let roleDisplayName = "Khách hàng";

  if (role === "Admin") {
    menuToBeRendered = adminMenu;
    roleDisplayName = "Quản lý (Admin)";
  } else if (role === "Staff") {
    menuToBeRendered = staffMenu;
    roleDisplayName = "Tài xế / Phụ xe";
  }

  let activeRoute = window.location.pathname;
  if (window.location.pathname.includes("book-now")) {
    activeRoute = "/";
  }

  return (
    <div className="layout-parent">
      <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <h1
            className="logo"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (role === "Staff") {
                navigate("/staff/scan-ticket");
              } else if (role === "Admin") {
                navigate("/admin/buses");
              } else {
                navigate("/");
              }
            }}
          >
            NXPN
          </h1>
          {!collapsed && (
            <div className="role" style={{ marginTop: 5 }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>{user?.name || "Người dùng"}</div>
              <span className="badge badge-info" style={{ fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "10px" }}>
                {roleDisplayName}
              </span>
            </div>
          )}
        </div>
        <div className="d-flex flex-column gap-2 justify-content-start menu">
          {menuToBeRendered.map((item, index) => {
            return (
              <div
                key={index}
                className={`${
                  activeRoute === item.path && "active-menu-item"
                } menu-item`}
                onClick={() => {
                  if (item.path === "/logout") {
                    localStorage.removeItem("token");
                    navigate("/login");
                  } else {
                    navigate(item.path);
                  }
                }}
              >
                <i className={item.icon}></i>
                {!collapsed && <span>{item.name}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="body">
        <div className="header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {collapsed ? (
              <i
                className="ri-menu-2-fill cursor-pointer"
                style={{ fontSize: "22px" }}
                onClick={() => setCollapsed(!collapsed)}
              ></i>
            ) : (
              <i
                className="ri-close-line cursor-pointer"
                style={{ fontSize: "22px" }}
                onClick={() => setCollapsed(!collapsed)}
              ></i>
            )}
            <span style={{ fontWeight: 600, fontSize: "16px", color: "#2E3A59" }}>
              Hệ thống đặt vé xe trực tuyến - Nha Xe Phuong Nam
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span style={{ fontSize: "14px", color: "#555" }}>
              Xin chào, <b>{user?.name}</b>
            </span>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export default DefaultLayout;
