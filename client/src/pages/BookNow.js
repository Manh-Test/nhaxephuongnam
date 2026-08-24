import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import { Row, Col, message, Modal, Button, Tag, Alert, Select, Steps } from "antd";
import SeatSelection from "../components/SeatSelection";
import { QRCodeSVG } from "qrcode.react";

function BookNow() {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bus, setBus] = useState(null);
  const [boardingStopIndex, setBoardingStopIndex] = useState(0);
  const [alightingStopIndex, setAlightingStopIndex] = useState(1);
  const [passengerInfo, setPassengerInfo] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [holdSeconds, setHoldSeconds] = useState(600); // 10 minutes temporary seat hold
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  const params = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.users);

  // Pre-fill passenger info with logged-in user
  useEffect(() => {
    if (user) {
      setPassengerInfo({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Fetch bus details and currently held seats
  const getBus = async (showLoader = false) => {
    try {
      if (showLoader) dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/get-bus-by-id", {
        _id: params.id,
      });
      if (showLoader) dispatch(HideLoading());
      if (response.data.success) {
        const busData = response.data.data;
        setBus(busData);
        if (busData.stops && busData.stops.length >= 2) {
          setAlightingStopIndex(busData.stops.length - 1);
        }
      }
    } catch (error) {
      if (showLoader) dispatch(HideLoading());
    }
  };

  // Initial load + background polling every 3 seconds for real-time seat lock sync
  useEffect(() => {
    getBus(true);
    const pollInterval = setInterval(() => {
      getBus(false);
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (selectedSeatsRef.current.length > 0) {
        axiosInstance.post("/api/buses/release-seats", {
          busId: params.id,
        }).catch(() => {});
      }
    };
  }, [params.id]);

  // Seat hold countdown timer
  useEffect(() => {
    if (selectedSeats.length > 0) {
      const interval = setInterval(() => {
        setHoldSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            axiosInstance.post("/api/buses/release-seats", {
              busId: params.id,
            }).catch(() => {});
            setSelectedSeats([]);
            getBus(false);
            message.warning("Thời gian tạm giữ chỗ (10 phút) đã hết. Ghế đã được giải phóng!");
            return 600;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setHoldSeconds(600);
    }
  }, [selectedSeats, params.id]);

  // Handle seat click with backend locking
  const handleSelectSeat = async (seatNumber) => {
    let newSeats;
    if (selectedSeats.includes(seatNumber)) {
      newSeats = selectedSeats.filter((s) => s !== seatNumber);
    } else {
      newSeats = [...selectedSeats, seatNumber];
    }

    try {
      const res = await axiosInstance.post("/api/buses/hold-seats", {
        busId: bus._id || bus.id,
        seats: newSeats,
      });

      if (res.data.success) {
        setSelectedSeats(newSeats);
        setHoldSeconds(600);
        getBus(false);
      } else {
        message.error(res.data.message);
        getBus(false);
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message);
    }
  };

  // Dynamic Stops & Segment Pricing
  const stops = bus?.stops && bus.stops.length >= 2 ? bus.stops : [
    { name: bus?.from || "Điểm đi", arrivalTime: "", departureTime: bus?.departure || "08:00", fare: 0 },
    { name: bus?.to || "Điểm đến", arrivalTime: bus?.arrival || "17:00", departureTime: "", fare: bus?.fare || 250000 }
  ];

  const boardingStop = stops[boardingStopIndex] || stops[0];
  const alightingStop = stops[alightingStopIndex] || stops[stops.length - 1];

  // Calculate per-seat fare between the two selected stops
  let singleSeatFare = Number(bus?.fare) || 200000;
  if (alightingStop.fare !== undefined && boardingStop.fare !== undefined) {
    const calculatedDiff = alightingStop.fare - boardingStop.fare;
    if (calculatedDiff > 0) {
      singleSeatFare = calculatedDiff;
    }
  }

  const baseTotal = selectedSeats.length * singleSeatFare;
  const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const finalTotal = Math.max(0, baseTotal - discountAmount);

  // Apply Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      message.warning("Vui lòng nhập mã giảm giá");
      return;
    }
    if (selectedSeats.length === 0) {
      message.warning("Vui lòng chọn ghế trước khi áp dụng mã giảm giá");
      return;
    }
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/vouchers/apply-voucher", {
        code: voucherCode.trim(),
        amount: baseTotal,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        setAppliedVoucher(response.data.data);
        message.success(response.data.message);
      } else {
        setAppliedVoucher(null);
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  // Perform Booking & Payment
  const handleCheckout = async () => {
    if (selectedSeats.length === 0) {
      message.warning("Vui lòng chọn ít nhất một chỗ ngồi!");
      return;
    }
    if (!passengerInfo.name.trim() || !passengerInfo.phone.trim()) {
      message.warning("Vui lòng nhập đầy đủ Họ tên và Số điện thoại hành khách!");
      return;
    }

    try {
      dispatch(ShowLoading());
      const paymentRes = await axiosInstance.post("/api/bookings/make-payment", {
        amount: finalTotal,
      });

      if (!paymentRes.data.success) {
        dispatch(HideLoading());
        message.error("Thanh toán không thành công: " + paymentRes.data.message);
        return;
      }

      const bookingRes = await axiosInstance.post("/api/bookings/book-seat", {
        bus: bus._id || bus.id,
        seats: selectedSeats,
        transactionId: paymentRes.data.data.transactionId,
        passengerName: passengerInfo.name,
        passengerPhone: passengerInfo.phone,
        passengerEmail: passengerInfo.email,
        boardingStop: boardingStop.name,
        alightingStop: alightingStop.name,
        voucherCode: appliedVoucher ? appliedVoucher.code : "",
        discountAmount: discountAmount,
        totalAmount: finalTotal,
      });
      dispatch(HideLoading());

      if (bookingRes.data.success) {
        message.success(bookingRes.data.message);
        setBookingSuccessData(bookingRes.data.data);
        setIsSuccessModalVisible(true);
        setSelectedSeats([]);
      } else {
        message.error(bookingRes.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div>
      {bus && (
        <Row gutter={[24, 24]}>
          {/* Left Column: Route Stops, Bus Info & Seat Selection */}
          <Col lg={14} sm={24} xs={24}>
            {/* Bus & Multi-Stop Card */}
            <div className="card p-4 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <Tag color="#1e3a8a" style={{ fontWeight: 700, borderRadius: 6 }}>
                    NXPN
                  </Tag>
                  <h1 className="text-xl font-bold text-primary mb-0">{bus.name}</h1>
                </div>
                <Tag color="blue">{bus.type}</Tag>
              </div>

              {/* Multi-Stop Timeline */}
              <div className="p-3 my-3" style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <p className="text-xs font-bold text-muted mb-2">
                  <i className="ri-map-pin-2-line text-primary mr-1"></i> TOÀN BỘ CÁC TRẠM DỪNG DỌC TUYẾN:
                </p>
                <div className="d-flex flex-wrap align-items-center gap-1">
                  {stops.map((st, idx) => (
                    <React.Fragment key={idx}>
                      <span
                        style={{
                          background: idx === boardingStopIndex ? "#dcfce7" : idx === alightingStopIndex ? "#fee2e2" : "#fff",
                          color: idx === boardingStopIndex ? "#15803d" : idx === alightingStopIndex ? "#b91c1c" : "#334155",
                          border: idx === boardingStopIndex ? "1.5px solid #16a34a" : idx === alightingStopIndex ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: idx === boardingStopIndex || idx === alightingStopIndex ? 700 : 500,
                        }}
                      >
                        {idx + 1}. {st.name} {st.departureTime ? `(${st.departureTime})` : ""}
                      </span>
                      {idx < stops.length - 1 && <i className="ri-arrow-right-line text-muted"></i>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Boarding & Alighting Stop Selection Dropdowns */}
              <div className="p-3 mb-3" style={{ background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                <h4 className="font-bold text-sm mb-2" style={{ color: "#1e40af" }}>
                  <i className="ri-guide-line mr-1"></i> Chọn điểm đón và điểm trả của bạn:
                </h4>
                <Row gutter={[12, 12]}>
                  <Col lg={12} xs={24}>
                    <label className="text-xs font-semibold text-gray-700">
                      🟢 Điểm đón (Trạm lên xe):
                    </label>
                    <Select
                      style={{ width: "100%", height: 40 }}
                      value={boardingStopIndex}
                      onChange={(val) => {
                        setBoardingStopIndex(val);
                        if (val >= alightingStopIndex) {
                          setAlightingStopIndex(Math.min(stops.length - 1, val + 1));
                        }
                      }}
                    >
                      {stops.slice(0, stops.length - 1).map((st, idx) => (
                        <Select.Option key={idx} value={idx}>
                          {st.name} {st.departureTime ? `(Giờ đón: ${st.departureTime})` : ""}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>

                  <Col lg={12} xs={24}>
                    <label className="text-xs font-semibold text-gray-700">
                      🔴 Điểm trả (Trạm xuống xe):
                    </label>
                    <Select
                      style={{ width: "100%", height: 40 }}
                      value={alightingStopIndex}
                      onChange={(val) => setAlightingStopIndex(val)}
                    >
                      {stops.slice(boardingStopIndex + 1).map((st, idx) => {
                        const actualIdx = boardingStopIndex + 1 + idx;
                        return (
                          <Select.Option key={actualIdx} value={actualIdx}>
                            {st.name} {st.arrivalTime ? `(Giờ đến: ${st.arrivalTime})` : ""}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                  <span className="text-xs text-muted">
                    Hành trình đã chọn: <b>{boardingStop.name} ➔ {alightingStop.name}</b>
                  </span>
                  <span className="text-sm font-bold text-primary">
                    Giá chặng: {singleSeatFare.toLocaleString("vi-VN")} VNĐ / ghế
                  </span>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="font-semibold mb-0">Sơ đồ chọn chỗ ngồi:</h3>
                {selectedSeats.length > 0 && (
                  <Tag color="orange" style={{ fontSize: 13, padding: "4px 12px", borderRadius: 8 }}>
                    <i className="ri-timer-line mr-1"></i> Tạm giữ chỗ: <b>{formatTimer(holdSeconds)}</b>
                  </Tag>
                )}
              </div>

              <SeatSelection
                selectedSeats={selectedSeats}
                bus={bus}
                onSelectSeat={handleSelectSeat}
              />
            </div>
          </Col>

          {/* Right Column: Passenger Details, Voucher & Checkout */}
          <Col lg={10} sm={24} xs={24}>
            {/* Passenger Information Form */}
            <div className="card p-4 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <h3 className="font-bold text-md mb-3" style={{ color: "#1e293b" }}>
                <i className="ri-user-3-line mr-1 text-primary"></i> Thông tin hành khách
              </h3>

              <div className="mb-3">
                <label className="text-sm font-semibold">Họ và tên hành khách (*)</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên người đi xe"
                  value={passengerInfo.name}
                  onChange={(e) => setPassengerInfo({ ...passengerInfo, name: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="text-sm font-semibold">Số điện thoại (*)</label>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại nhận vé/SMS"
                  value={passengerInfo.phone}
                  onChange={(e) => setPassengerInfo({ ...passengerInfo, phone: e.target.value })}
                />
              </div>

              <div className="mb-2">
                <label className="text-sm font-semibold">Email nhận vé điện tử</label>
                <input
                  type="email"
                  placeholder="Nhập email nhận vé và mã QR"
                  value={passengerInfo.email}
                  onChange={(e) => setPassengerInfo({ ...passengerInfo, email: e.target.value })}
                />
              </div>
            </div>

            {/* Voucher Promotion Box */}
            <div className="card p-4 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <h3 className="font-bold text-md mb-3" style={{ color: "#1e293b" }}>
                <i className="ri-coupon-3-line mr-1 text-primary"></i> Mã giảm giá / Voucher
              </h3>
              <div className="d-flex gap-2" style={{ alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="VD: PHUONGNAM10, GIAM30K, WELCOME"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, height: "42px", padding: "0 14px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
                <button className="primary-btn" style={{ height: "42px", padding: "0 20px" }} onClick={handleApplyVoucher}>
                  Áp dụng
                </button>
              </div>

              {appliedVoucher && (
                <Alert
                  className="mt-3"
                  message={`Mã "${appliedVoucher.code}" hợp lệ! Tiết kiệm: ${appliedVoucher.discountAmount.toLocaleString("vi-VN")} VNĐ`}
                  type="success"
                  showIcon
                  closable
                  onClose={() => setAppliedVoucher(null)}
                />
              )}
            </div>

            {/* Order Summary & Payment Button */}
            <div className="card p-4 shadow-sm" style={{ borderRadius: 12, background: "#f8fafc" }}>
              <h3 className="font-bold text-md mb-3" style={{ color: "#1e293b" }}>
                <i className="ri-bill-line mr-1 text-primary"></i> Chi tiết thanh toán
              </h3>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Chặng đi:</span>
                <b>{boardingStop.name} ➔ {alightingStop.name}</b>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Giá vé chặng:</span>
                <span>{singleSeatFare.toLocaleString("vi-VN")} VNĐ / ghế</span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Ghế đã chọn:</span>
                <b>{selectedSeats.length > 0 ? selectedSeats.join(", ") : "Chưa chọn ghế"}</b>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Tạm tính ({selectedSeats.length} ghế):</span>
                <span>{baseTotal.toLocaleString("vi-VN")} VNĐ</span>
              </div>

              {discountAmount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Giảm giá khuyến mãi:</span>
                  <span>- {discountAmount.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between align-items-center mb-4">
                <span className="font-bold text-lg">Tổng thanh toán:</span>
                <span className="font-bold text-xl" style={{ color: "#e11d48" }}>
                  {finalTotal.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>

              <button
                className="primary-btn w-100"
                style={{ padding: "12px", fontSize: 16, fontWeight: "bold" }}
                disabled={selectedSeats.length === 0}
                onClick={handleCheckout}
              >
                <i className="ri-secure-payment-line mr-2"></i> Xác nhận & Thanh toán trực tuyến
              </button>
            </div>
          </Col>
        </Row>
      )}

      {/* Success Booking & E-Ticket Modal */}
      <Modal
        title={
          <div className="text-center font-bold text-lg text-success">
            🎉 ĐẶT VÉ VÀ THANH TOÁN THÀNH CÔNG!
          </div>
        }
        visible={isSuccessModalVisible}
        footer={[
          <Button key="bookings" type="primary" onClick={() => navigate("/bookings")}>
            Xem danh sách vé của tôi
          </Button>,
        ]}
        closable={false}
        width={500}
      >
        {bookingSuccessData && (
          <div className="text-center p-3">
            <div className="p-3 mb-3" style={{ background: "#f1f5f9", borderRadius: 10 }}>
              <p className="text-muted text-sm mb-1">Mã vé Nha Xe Phuong Nam</p>
              <h2 className="font-bold text-primary mb-0">{bookingSuccessData.ticketCode}</h2>
            </div>

            {/* Render QR Code */}
            <div className="d-flex justify-content-center mb-3">
              <div style={{ background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    ticketCode: bookingSuccessData.ticketCode,
                    passenger: passengerInfo.name,
                    bus: bus?.number,
                    from: boardingStop.name,
                    to: alightingStop.name,
                    seats: selectedSeats,
                  })}
                  size={160}
                />
              </div>
            </div>

            <p className="text-sm text-muted mb-2">
              Hãy lưu mã QR này hoặc xuất trình mã vé <b>{bookingSuccessData.ticketCode}</b> cho nhân viên xe khi lên xe.
            </p>

            <div className="text-left text-sm p-3" style={{ background: "#f8fafc", borderRadius: 8 }}>
              <p className="mb-1"><b>Tuyến xe:</b> {bus?.name}</p>
              <p className="mb-1"><b>Chặng đón / trả:</b> <span className="text-primary font-bold">{boardingStop.name} ➔ {alightingStop.name}</span></p>
              <p className="mb-1"><b>Hành khách:</b> {passengerInfo.name} ({passengerInfo.phone})</p>
              <p className="mb-1"><b>Ghế ngồi:</b> {selectedSeats.join(", ")}</p>
              <p className="mb-0"><b>Tổng tiền đã thanh toán:</b> {finalTotal.toLocaleString("vi-VN")} VNĐ</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BookNow;
