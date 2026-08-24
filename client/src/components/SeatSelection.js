import React from "react";
import { Row, Col, Tooltip } from "antd";
import "../resourses/bus.css";

function SeatSelection({ selectedSeats, bus, onSelectSeat }) {
  const capacity = bus?.capacity || 30;
  const seatsBooked = bus?.seatsBooked || [];
  const seatsHeldByOthers = bus?.seatsHeldByOthers || [];

  return (
    <div className="mx-auto" style={{ maxWidth: 360 }}>
      {/* Front of bus indicator */}
      <div
        className="text-center p-2 mb-3 font-semibold text-muted text-xs"
        style={{
          background: "#e2e8f0",
          borderRadius: "8px 8px 0 0",
          borderBottom: "2px dashed #94a3b8",
          letterSpacing: 1,
        }}
      >
        <i className="ri-steering-2-line mr-1"></i> ĐẦU XE (BÁC TÀI)
      </div>

      <div className="bus-container">
        <Row gutter={[10, 10]}>
          {Array.from(Array(capacity).keys()).map((seat) => {
            const seatNumber = seat + 1;
            let seatClass = "";
            let tooltipText = `Ghế số ${seatNumber} (Còn trống)`;

            if (selectedSeats.includes(seatNumber)) {
              seatClass = "selected-seat";
              tooltipText = `Ghế số ${seatNumber} (Bạn đang chọn)`;
            } else if (seatsBooked.includes(seatNumber)) {
              seatClass = "booked-seat";
              tooltipText = `Ghế số ${seatNumber} (Đã có người mua)`;
            } else if (seatsHeldByOthers.includes(seatNumber)) {
              seatClass = "held-seat";
              tooltipText = `Ghế số ${seatNumber} (Đang được tài khoản khác tạm giữ chỗ)`;
            }

            return (
              <Col span={6} key={seatNumber}>
                <Tooltip title={tooltipText}>
                  <div
                    className={`seat ${seatClass}`}
                    onClick={() => {
                      if (seatsBooked.includes(seatNumber)) return;
                      if (seatsHeldByOthers.includes(seatNumber)) return;
                      onSelectSeat(seatNumber);
                    }}
                  >
                    {seatNumber}
                  </div>
                </Tooltip>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* Legend */}
      <div className="seat-legend">
        <div className="legend-item">
          <div className="legend-box" style={{ background: "#ffffff" }}></div>
          <span>Trống</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: "#2563eb", borderColor: "#1d4ed8" }}></div>
          <span>Đang chọn</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: "#f59e0b", borderColor: "#d97706" }}></div>
          <span>Đang giữ chỗ</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: "#94a3b8", borderColor: "#64748b" }}></div>
          <span>Đã bán</span>
        </div>
      </div>
    </div>
  );
}

export default SeatSelection;
