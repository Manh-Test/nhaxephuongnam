import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { message, Row, Col, Button, Tag, Alert } from "antd";
import PageTitle from "../../components/PageTitle";
import { Html5QrcodeScanner } from "html5-qrcode";

function StaffScanTicket() {
  const [assignedBus, setAssignedBus] = useState(null);
  const [ticketInput, setTicketInput] = useState("");
  const [scannedTicket, setScannedTicket] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'valid', 'wrong_bus', 'already_boarded', 'invalid', 'cancelled'
  const [statusMessage, setStatusMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const dispatch = useDispatch();

  // Load the single bus assigned to this staff member by Admin
  const getMyBus = async () => {
    try {
      dispatch(ShowLoading());
      const res = await axiosInstance.post("/api/buses/get-my-assigned-bus", {});
      dispatch(HideLoading());
      if (res.data.success && res.data.data) {
        setAssignedBus(res.data.data);
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

  // Start QR Scanner via camera
  const startScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          try {
            let code = decodedText;
            if (decodedText.startsWith("{")) {
              const parsed = JSON.parse(decodedText);
              code = parsed.ticketCode || decodedText;
            }
            scanner.clear();
            setScannerActive(false);
            setTicketInput(code);
            verifyTicket(code);
          } catch (e) {
            scanner.clear();
            setScannerActive(false);
            setTicketInput(decodedText);
            verifyTicket(decodedText);
          }
        },
        (error) => {}
      );
    }, 200);
  };

  // Verify ticket with staff's single assigned bus validation
  const verifyTicket = async (codeToVerify) => {
    const code = codeToVerify || ticketInput;
    if (!code.trim()) {
      message.warning("Vui lòng nhập hoặc quét mã vé");
      return;
    }
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/bookings/verify-ticket", {
        ticketCode: code.trim(),
        expectedBusId: assignedBus ? (assignedBus.id || assignedBus._id) : null,
      });
      dispatch(HideLoading());

      setStatusMessage(response.data.message);

      if (response.data.success) {
        setScannedTicket(response.data.data);
        setVerificationStatus("valid");
        message.success(response.data.message);
      } else {
        setScannedTicket(response.data.data || null);
        if (response.data.isWrongBus) {
          setVerificationStatus("wrong_bus");
          message.error(response.data.message);
        } else if (response.data.isAlreadyBoarded) {
          setVerificationStatus("already_boarded");
          message.warning(response.data.message);
        } else if (response.data.data?.status === "Cancelled") {
          setVerificationStatus("cancelled");
          message.error(response.data.message);
        } else {
          setVerificationStatus("invalid");
          message.error(response.data.message);
        }
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  // Confirm Boarding (Xác nhận lên xe)
  const handleMarkBoarded = async () => {
    if (!scannedTicket) return;
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/bookings/mark-boarded", {
        bookingId: scannedTicket.id,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        setScannedTicket({ ...scannedTicket, status: "Boarded" });
        setVerificationStatus("already_boarded");
        setStatusMessage(`Đã xác nhận lên xe thành công lúc ${new Date().toLocaleTimeString("vi-VN")}`);
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
      <PageTitle title="Soát vé hành khách & Kiểm tra QR (Tài xế / Phụ xe)" />

      {/* Active Single Bus Header */}
      {assignedBus ? (
        <div
          className="card p-3 shadow-sm mt-3 mb-3 d-flex justify-content-between align-items-center"
          style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10 }}
        >
          <div className="d-flex align-items-center gap-2">
            <Tag color="green" style={{ fontWeight: 700, fontSize: 13, padding: "2px 8px" }}>
              <i className="ri-steering-fill mr-1"></i> XE BẠN ĐƯỢC PHÂN CÔNG
            </Tag>
            <b className="text-primary" style={{ fontSize: 15 }}>
              {assignedBus.name} ({assignedBus.number})
            </b>
            <span className="text-muted text-xs">
              {assignedBus.from} ➔ {assignedBus.to} | {assignedBus.journeyDate}
            </span>
          </div>
          <div>
            <Tag color={assignedBus.status === "Running" ? "green" : assignedBus.status === "Stopping" ? "gold" : "blue"}>
              {assignedBus.status === "Running" ? "🟢 Đang chạy" : assignedBus.status === "Stopping" ? "🟡 Tạm dừng" : "⚪ Chưa chạy"}
            </Tag>
          </div>
        </div>
      ) : (
        <Alert
          className="mt-3 mb-3"
          message="Bạn chưa được Admin phân công chuyến xe nào!"
          description="Chỉ Quản lý (Admin) mới có quyền phân công chuyến xe. Vui lòng liên hệ Admin để nhận chuyến xe phụ trách trước khi soát vé."
          type="warning"
          showIcon
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Left Column: Scanner & Input */}
        <Col lg={12} sm={24} xs={24}>
          <div className="card p-4 shadow-sm" style={{ borderRadius: 12 }}>
            <h3 className="font-bold text-md mb-3" style={{ color: "#1e293b" }}>
              <i className="ri-qr-scan-2-line mr-2 text-primary"></i> Quét mã QR hoặc Nhập mã vé
            </h3>

            <div className="d-flex gap-2 mb-3">
              <input
                type="text"
                placeholder="VD: NXPN-2026-123456"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                style={{ flex: 1, height: 42, padding: "0 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 15 }}
              />
              <button className="primary-btn" style={{ height: 42, padding: "0 20px" }} onClick={() => verifyTicket()}>
                Kiểm tra
              </button>
            </div>

            <div className="text-center my-2">
              <span className="text-muted text-xs">── HOẶC QUÉT BẰNG CAMERA ──</span>
            </div>

            <div className="text-center mt-2">
              {!scannerActive ? (
                <Button
                  type="dashed"
                  size="large"
                  icon={<i className="ri-camera-lens-line mr-2"></i>}
                  style={{ width: "100%", height: 46, fontSize: 15, borderColor: "#3b82f6", color: "#3b82f6", borderRadius: 8 }}
                  onClick={startScanner}
                >
                  Bật Camera Quét Mã QR Vé
                </Button>
              ) : (
                <div>
                  <div id="qr-reader" style={{ width: "100%", margin: "0 auto" }}></div>
                  <Button
                    danger
                    className="mt-2"
                    onClick={() => {
                      setScannerActive(false);
                    }}
                  >
                    Tắt Camera Scanner
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Col>

        {/* Right Column: Ticket Verification Result */}
        <Col lg={12} sm={24} xs={24}>
          <div className="card p-4 shadow-sm" style={{ borderRadius: 12 }}>
            <h3 className="font-bold text-md mb-3" style={{ color: "#1e293b" }}>
              <i className="ri-file-list-3-line mr-2 text-primary"></i> Kết quả soát vé
            </h3>

            {/* Wrong Bus Alert */}
            {verificationStatus === "wrong_bus" && (
              <Alert
                message="⚠️ CẢNH BÁO: VÉ SAI CHUYẾN XE!"
                description={statusMessage}
                type="error"
                showIcon
                className="mb-3"
              />
            )}

            {verificationStatus === "valid" && (
              <Alert
                message="VÉ HỢP LỆ (ĐÚNG CHUYẾN XE)!"
                description="Hành khách đã thanh toán. Sẵn sàng cho lên xe."
                type="success"
                showIcon
                className="mb-3"
              />
            )}

            {verificationStatus === "already_boarded" && (
              <Alert
                message="VÉ ĐÃ SOÁT / ĐÃ LÊN XE!"
                description={statusMessage}
                type="warning"
                showIcon
                className="mb-3"
              />
            )}

            {verificationStatus === "cancelled" && (
              <Alert
                message="VÉ ĐÃ BỊ HỦY!"
                description="Vé này không còn giá trị sử dụng."
                type="error"
                showIcon
                className="mb-3"
              />
            )}

            {verificationStatus === "invalid" && (
              <Alert
                message="VÉ KHÔNG HỢP LỆ!"
                description="Không tìm thấy thông tin vé này trên hệ thống."
                type="error"
                showIcon
                className="mb-3"
              />
            )}

            {scannedTicket ? (
              <div className="p-3" style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Mã vé:</span>
                  <b className="text-primary text-lg">{scannedTicket.ticketCode || `NXPN-${scannedTicket.id}`}</b>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Hành khách:</span>
                  <b>{scannedTicket.passengerName || scannedTicket.user?.name}</b>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Số điện thoại:</span>
                  <b>{scannedTicket.passengerPhone || scannedTicket.user?.phone}</b>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Tuyến xe:</span>
                  <span>{scannedTicket.bus?.name} ({scannedTicket.bus?.number})</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Chặng đón / trả:</span>
                  <b style={{ color: "#1e40af" }}>
                    {scannedTicket.boardingStop || scannedTicket.bus?.from} ➔ {scannedTicket.alightingStop || scannedTicket.bus?.to}
                  </b>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted text-sm">Ngày & Giờ đi:</span>
                  <span>{scannedTicket.bus?.journeyDate} ({scannedTicket.bus?.departure})</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted text-sm">Vị trí ghế ngồi:</span>
                  <Tag color="geekblue" style={{ fontSize: 14, padding: "4px 10px", fontWeight: "bold" }}>
                    {scannedTicket.seats.join(", ")}
                  </Tag>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="text-muted text-sm">Trạng thái vé:</span>
                  <Tag color={scannedTicket.status === "Boarded" ? "cyan" : scannedTicket.status === "Cancelled" ? "red" : "green"}>
                    {scannedTicket.status === "Boarded" ? "Đã lên xe" : scannedTicket.status === "Cancelled" ? "Đã hủy" : "Hợp lệ"}
                  </Tag>
                </div>

                {/* Confirm Boarding Button (Only allowed if valid and matches staff's bus) */}
                {scannedTicket.status === "Paid" && verificationStatus === "valid" && (
                  <button
                    className="primary-btn w-100 mt-3"
                    style={{ padding: "12px", fontSize: 16, background: "#16a34a", borderColor: "#16a34a" }}
                    onClick={handleMarkBoarded}
                  >
                    <i className="ri-user-follow-line mr-2"></i> Xác nhận cho hành khách lên xe
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center p-4 text-muted">
                <i className="ri-scan-line" style={{ fontSize: 36 }}></i>
                <p className="mt-2 text-sm">Chưa có vé nào được quét. Hãy nhập mã vé hoặc bật camera để quét mã QR.</p>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default StaffScanTicket;
