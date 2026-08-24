import React from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Tooltip } from "antd";

function Bus({ bus }) {
  const navigate = useNavigate();
  const available =
    bus.availableSeats !== undefined
      ? bus.availableSeats
      : Math.max(0, bus.capacity - (bus.seatsBooked?.length || 0));

  const stops = bus.stops && bus.stops.length > 0 ? bus.stops : [
    { name: bus.from || "Điểm đi" },
    { name: bus.to || "Điểm đến" }
  ];

  return (
    <div
      className="card p-3 shadow-sm mb-3"
      style={{ borderRadius: 12, border: "1px solid #e2e8f0", transition: "all 0.2s ease" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <Tag color="#1e3a8a" style={{ fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>
            <i className="ri-bus-fill mr-1"></i> NXPN
          </Tag>
          <h1 className="text-lg font-bold" style={{ color: "#1e3a8a", margin: 0 }}>
            {bus.name}
          </h1>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: "normal" }}>
            ({bus.number})
          </span>
        </div>

        <span
          className="badge"
          style={{
            background:
              bus.status === "Running"
                ? "#10b981"
                : bus.status === "Completed"
                ? "#6b7280"
                : "#3b82f6",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: 12,
          }}
        >
          {bus.status === "Running" ? "Đang chạy" : bus.status === "Completed" ? "Đã đến nơi" : "Chưa khởi hành"}
        </span>
      </div>

      <hr style={{ margin: "8px 0" }} />

      {/* Multi-Stop Sequence Route Display */}
      <div className="p-2 mb-2" style={{ background: "#f8fafc", borderRadius: 8 }}>
        <p className="text-xs text-muted mb-1 font-semibold">
          <i className="ri-route-line mr-1 text-primary"></i> LỘ TRÌNH VÀ CÁC TRẠM DỪNG ({stops.length} TRẠM):
        </p>
        <div className="d-flex flex-wrap align-items-center gap-1">
          {stops.map((st, idx) => (
            <React.Fragment key={idx}>
              <Tooltip title={st.departureTime ? `Xuất bến: ${st.departureTime}` : st.arrivalTime ? `Đến nơi: ${st.arrivalTime}` : ""}>
                <span
                  style={{
                    background: idx === 0 ? "#dcfce7" : idx === stops.length - 1 ? "#fee2e2" : "#eff6ff",
                    color: idx === 0 ? "#15803d" : idx === stops.length - 1 ? "#b91c1c" : "#1d4ed8",
                    padding: "3px 9px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {st.name}
                </span>
              </Tooltip>
              {idx < stops.length - 1 && (
                <i className="ri-arrow-right-s-line text-muted" style={{ fontSize: 16 }}></i>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="d-flex justify-content-between p-2" style={{ background: "#f1f5f9", borderRadius: 8 }}>
        <div>
          <p className="text-xs text-muted mb-0">Ngày khởi hành</p>
          <p className="font-semibold text-sm mb-0">
            <i className="ri-calendar-line mr-1"></i> {bus.journeyDate}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0">Giờ xuất bến đầu - Đến cuối</p>
          <p className="font-semibold text-sm mb-0">
            <i className="ri-time-line mr-1"></i> {bus.departure} ➔ {bus.arrival}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0">Loại xe</p>
          <p className="font-semibold text-sm mb-0">{bus.type}</p>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 pt-2">
        <div>
          <p className="text-sm text-muted mb-0">
            Chỗ trống:{" "}
            <b style={{ color: available > 0 ? "#16a34a" : "#dc2626" }}>
              {available} / {bus.capacity}
            </b>
          </p>
          <p className="text-lg font-bold mb-0" style={{ color: "#e11d48" }}>
            {Number(bus.fare).toLocaleString("vi-VN")} VNĐ{" "}
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: "normal" }}>
              / vé trọn tuyến (Có vé theo trạm)
            </span>
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="secondary-btn"
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => navigate(`/tracking?busId=${bus._id || bus.id}`)}
          >
            <i className="ri-map-pin-line mr-1"></i> Định vị xe
          </button>
          <button
            className="primary-btn"
            style={{ padding: "6px 18px", fontSize: 13 }}
            disabled={available <= 0}
            onClick={() => {
              navigate(`/book-now/${bus._id || bus.id}`);
            }}
          >
            {available > 0 ? "Chọn ghế & Điểm đón" : "Hết vé"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Bus;
