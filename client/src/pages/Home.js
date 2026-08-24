import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import Bus from "../components/Bus";
import { Row, Col, message } from "antd";

function Home() {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    journeyDate: "",
  });
  const [buses, setBuses] = useState([]);
  const dispatch = useDispatch();

  const getBuses = async () => {
    const tempFilters = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        tempFilters[key] = filters[key];
      }
    });
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/get-all-buses", tempFilters);
      dispatch(HideLoading());
      if (response.data.success) {
        setBuses(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getBuses();
  }, []);

  return (
    <div>
      {/* Banner & Search box */}
      <div
        className="card p-4 mb-4 shadow-sm"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          color: "#fff",
          borderRadius: 12,
        }}
      >
        <div className="d-flex align-items-center gap-2 mb-2">
          <span style={{ background: "#fbbf24", color: "#1e3a8a", padding: "3px 10px", borderRadius: 6, fontWeight: "bold", fontSize: 13 }}>
            CHÍNH HÃNG
          </span>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: 0 }}>
            Hệ thống đặt vé Nha Xe Phuong Nam
          </h2>
        </div>
        <p style={{ color: "#e0e7ff", fontSize: 14, marginBottom: 16 }}>
          Mạng lưới tuyến đường xuyên suốt nhiều tỉnh thành với các trạm đón/trả linh hoạt dọc hành trình
        </p>

        <div className="card p-3" style={{ background: "#ffffff", borderRadius: 10 }}>
          <Row gutter={[16, 16]}>
            <Col lg={7} sm={24} xs={24}>
              <label className="text-sm font-semibold text-gray-700">
                <i className="ri-map-pin-user-line text-success mr-1"></i> Điểm đón (Trạm lên xe)
              </label>
              <input
                type="text"
                placeholder="VD: Hồ Chí Minh, Phan Thiết, Bảo Lộc, Cần Thơ..."
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                style={{ width: "100%", height: 42, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </Col>
            <Col lg={7} sm={24} xs={24}>
              <label className="text-sm font-semibold text-gray-700">
                <i className="ri-map-pin-fill text-danger mr-1"></i> Điểm trả (Trạm xuống xe)
              </label>
              <input
                type="text"
                placeholder="VD: Đà Lạt, Nha Trang, Vũng Tàu, Hà Nội..."
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                style={{ width: "100%", height: 42, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </Col>
            <Col lg={6} sm={24} xs={24}>
              <label className="text-sm font-semibold text-gray-700">
                <i className="ri-calendar-line text-primary mr-1"></i> Ngày khởi hành
              </label>
              <input
                type="date"
                value={filters.journeyDate}
                onChange={(e) => setFilters({ ...filters, journeyDate: e.target.value })}
                style={{ width: "100%", height: 42, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </Col>
            <Col lg={4} sm={24} xs={24} style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
              <button
                className="primary-btn"
                style={{ flex: 1, height: "42px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => getBuses()}
              >
                <i className="ri-search-line"></i> Tìm chuyến
              </button>
              <button
                className="secondary-btn"
                style={{ height: "42px", width: "42px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Xóa bộ lọc"
                onClick={() => {
                  setFilters({ from: "", to: "", journeyDate: "" });
                  getBuses();
                }}
              >
                <i className="ri-refresh-line"></i>
              </button>
            </Col>
          </Row>
        </div>
      </div>

      {/* Results Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="font-bold text-lg" style={{ color: "#1e3a8a", margin: 0 }}>
          <i className="ri-bus-line mr-1"></i> Danh sách chuyến xe Nha Xe Phuong Nam ({buses.length})
        </h3>
      </div>

      {/* Bus List */}
      <div>
        {buses.length > 0 ? (
          buses.map((bus) => <Bus key={bus._id || bus.id} bus={bus} />)
        ) : (
          <div className="card p-5 text-center shadow-sm" style={{ borderRadius: 12 }}>
            <i className="ri-bus-line text-muted" style={{ fontSize: 48 }}></i>
            <h4 className="mt-3 font-semibold text-gray-700">Không tìm thấy chuyến xe nào phù hợp</h4>
            <p className="text-muted text-sm">
              Bạn có thể thử tìm theo tên trạm trung gian hoặc xóa bộ lọc để xem toàn bộ danh sách tuyến xe của Nha Xe Phuong Nam.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
