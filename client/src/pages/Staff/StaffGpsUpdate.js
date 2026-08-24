import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { message, Row, Col, Button, Tag, Alert } from "antd";
import PageTitle from "../../components/PageTitle";

function StaffGpsUpdate() {
  const [assignedBus, setAssignedBus] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("Yet To Start");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const dispatch = useDispatch();

  // Load the single bus assigned to this staff member by Admin
  const getMyBus = async () => {
    try {
      dispatch(ShowLoading());
      const res = await axiosInstance.post("/api/buses/get-my-assigned-bus", {});
      dispatch(HideLoading());
      if (res.data.success && res.data.data) {
        const bus = res.data.data;
        setAssignedBus(bus);
        setCurrentStatus(bus.status || "Yet To Start");
        setLat(bus.currentLatitude || 10.7769);
        setLng(bus.currentLongitude || 106.7009);
      } else {
        setAssignedBus(null);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getMyBus();
  }, []);

  // Staff toggles status (Running / Stopping / Completed / Yet To Start)
  const handleToggleStatus = async (newStatus) => {
    if (!assignedBus) return;
    try {
      dispatch(ShowLoading());
      const res = await axiosInstance.post("/api/buses/update-bus-status", {
        busId: assignedBus.id || assignedBus._id,
        status: newStatus,
      });
      dispatch(HideLoading());
      if (res.data.success) {
        setCurrentStatus(newStatus);
        message.success(res.data.message);
        setStatusMsg(`Đã cập nhật trạng thái chuyến xe sang: "${newStatus}" lúc ${new Date().toLocaleTimeString("vi-VN")}`);
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  // Get GPS automatically from device
  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          message.success("Đã lấy tọa độ GPS từ thiết bị!");
        },
        (error) => {
          message.warning("Không thể lấy GPS từ thiết bị: " + error.message);
        }
      );
    } else {
      message.warning("Trình duyệt không hỗ trợ định vị GPS!");
    }
  };

  // Update GPS for this single assigned bus
  const handleUpdateGps = async () => {
    if (!assignedBus) {
      message.warning("Bạn chưa được Admin phân công chuyến xe nào!");
      return;
    }
    if (!lat || !lng) {
      message.warning("Vui lòng nhập hoặc lấy tọa độ GPS");
      return;
    }
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/update-gps", {
        busId: assignedBus.id || assignedBus._id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        setStatusMsg(`Đã phát vị trí thành công cho xe ${assignedBus.number} lúc ${new Date().toLocaleTimeString("vi-VN")}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  return (
    <div>
      <PageTitle title="Cập nhật vị trí GPS & Trạng thái xe (Tài xế / Phụ xe)" />

      {/* Single Assigned Bus Card */}
      {assignedBus ? (
        <div className="card p-4 shadow-sm mt-3" style={{ borderRadius: 12, maxWidth: 720 }}>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Tag color="green" style={{ fontSize: 13, padding: "3px 10px", borderRadius: 6, fontWeight: "bold" }}>
                <i className="ri-steering-2-line mr-1"></i> XE ĐƯỢC ADMIN PHÂN CÔNG
              </Tag>
              <h2 className="text-lg font-bold text-primary mt-2 mb-0">
                {assignedBus.name} ({assignedBus.number})
              </h2>
            </div>
            <div>
              <Tag
                color={
                  currentStatus === "Running"
                    ? "green"
                    : currentStatus === "Stopping"
                    ? "gold"
                    : currentStatus === "Completed"
                    ? "default"
                    : "blue"
                }
                style={{ fontSize: 13, padding: "4px 12px", fontWeight: "bold", borderRadius: 6 }}
              >
                {currentStatus === "Running"
                  ? "🟢 Đang chạy"
                  : currentStatus === "Stopping"
                  ? "🟡 Tạm dừng"
                  : currentStatus === "Completed"
                  ? "🔴 Đã đến nơi"
                  : "⚪ Chưa khởi hành"}
              </Tag>
            </div>
          </div>

          <div className="p-3 mb-3" style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <p className="mb-1 text-sm">
              <b>Lộ trình:</b> {assignedBus.from} ➔ {assignedBus.to} ({assignedBus.stops?.length || 2} trạm dừng)
            </p>
            <p className="mb-0 text-sm">
              <b>Ngày khởi hành:</b> {assignedBus.journeyDate} | <b>Giờ xuất bến:</b> {assignedBus.departure} - {assignedBus.arrival}
            </p>
          </div>

          {/* Running / Stopping Status Toggle Section */}
          <div className="p-3 mb-4" style={{ background: "#f0fdf4", borderRadius: 10, border: "1.5px solid #86efac" }}>
            <h4 className="font-bold text-sm mb-2" style={{ color: "#166534" }}>
              <i className="ri-toggle-line mr-1"></i> Chuyển đổi trạng thái hoạt động của xe:
            </h4>
            <p className="text-xs text-muted mb-3">
              Bấm nút tương ứng để cập nhật trạng thái di chuyển của xe cho khách hàng và ban quản lý theo dõi thời gian thực.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <Button
                type={currentStatus === "Running" ? "primary" : "default"}
                style={{
                  background: currentStatus === "Running" ? "#16a34a" : "#fff",
                  borderColor: "#16a34a",
                  color: currentStatus === "Running" ? "#fff" : "#16a34a",
                  fontWeight: 600,
                  height: 40,
                  borderRadius: 8,
                }}
                icon={<i className="ri-play-circle-line mr-1"></i>}
                onClick={() => handleToggleStatus("Running")}
              >
                🟢 Đang chạy (Running)
              </Button>

              <Button
                type={currentStatus === "Stopping" ? "primary" : "default"}
                style={{
                  background: currentStatus === "Stopping" ? "#d97706" : "#fff",
                  borderColor: "#d97706",
                  color: currentStatus === "Stopping" ? "#fff" : "#d97706",
                  fontWeight: 600,
                  height: 40,
                  borderRadius: 8,
                }}
                icon={<i className="ri-pause-circle-line mr-1"></i>}
                onClick={() => handleToggleStatus("Stopping")}
              >
                🟡 Tạm dừng / Nghỉ chân (Stopping)
              </Button>

              <Button
                type={currentStatus === "Yet To Start" ? "primary" : "default"}
                style={{
                  height: 40,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
                icon={<i className="ri-time-line mr-1"></i>}
                onClick={() => handleToggleStatus("Yet To Start")}
              >
                ⚪ Chưa khởi hành
              </Button>

              <Button
                type={currentStatus === "Completed" ? "primary" : "default"}
                danger={currentStatus === "Completed"}
                style={{
                  height: 40,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
                icon={<i className="ri-check-double-line mr-1"></i>}
                onClick={() => handleToggleStatus("Completed")}
              >
                🔴 Đã đến nơi (Kết thúc)
              </Button>
            </div>
          </div>

          {/* Real-Time GPS Section */}
          <h4 className="font-bold text-sm mb-2" style={{ color: "#334155" }}>
            <i className="ri-broadcast-line text-primary mr-1"></i> Phát tọa độ GPS thời gian thực:
          </h4>

          <Row gutter={[16, 16]} className="mb-3">
            <Col span={12}>
              <label className="text-xs font-semibold text-muted">Vĩ độ (Latitude)</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
            </Col>
            <Col span={12}>
              <label className="text-xs font-semibold text-muted">Kinh độ (Longitude)</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
            </Col>
          </Row>

          <div className="d-flex gap-2 mb-3">
            <Button style={{ height: 42 }} icon={<i className="ri-crosshair-2-line mr-1"></i>} onClick={getCurrentLocation}>
              Lấy GPS từ thiết bị
            </Button>
            <button className="primary-btn flex-1" style={{ height: 42 }} onClick={handleUpdateGps}>
              <i className="ri-radar-line mr-1"></i> Phát vị trí xe lên bản đồ
            </button>
          </div>

          {statusMsg && (
            <Alert message={statusMsg} type="success" showIcon style={{ borderRadius: 8 }} />
          )}
        </div>
      ) : (
        /* No assigned bus by Admin */
        <div className="card p-5 shadow-sm mt-3 text-center" style={{ borderRadius: 12, maxWidth: 650 }}>
          <i className="ri-user-unfollow-line text-warning" style={{ fontSize: 54, color: "#d97706" }}></i>
          <h3 className="font-bold text-lg mt-3" style={{ color: "#1e293b" }}>
            Bạn chưa được Admin phân công chuyến xe nào
          </h3>
          <p className="text-muted text-sm mb-3">
            Chỉ Quản lý (Admin) mới có quyền phân công chuyến xe cho Tài xế / Phụ xe.
          </p>
          <Alert
            message="Vui lòng liên hệ Quản trị viên để được phân công xe phụ trách."
            type="info"
            showIcon
            style={{ maxWidth: 450, margin: "0 auto", textAlign: "left", borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}

export default StaffGpsUpdate;
