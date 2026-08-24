import React, { useEffect, useRef, useState } from "react";
import { message, Modal, Table, Tag, Button, Popconfirm } from "antd";
import { useDispatch } from "react-redux";
import PageTitle from "../../components/PageTitle";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

function AdminBookings() {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const dispatch = useDispatch();
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const getBookings = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/bookings/get-all-bookings", {});
      dispatch(HideLoading());
      if (response.data.success) {
        setBookings(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/bookings/cancel-booking", {
        bookingId,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getBookings();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getBookings();
  }, []);

  const columns = [
    {
      title: "Mã vé",
      dataIndex: "ticketCode",
      key: "ticketCode",
      render: (code, record) => (
        <div>
          <b className="text-primary">{code || `NXPN-${record.id}`}</b>
          <div style={{ fontSize: 11, color: "#64748b" }}>{record.transactionId}</div>
        </div>
      ),
    },
    {
      title: "Hành khách",
      dataIndex: "passengerName",
      key: "passengerName",
      render: (name, record) => (
        <div>
          <b>{name || record.user?.name}</b>
          <div style={{ fontSize: 12, color: "#64748b" }}>{record.passengerPhone || record.user?.phone}</div>
        </div>
      ),
    },
    {
      title: "Tuyến xe / Xe",
      dataIndex: "bus",
      key: "bus",
      render: (bus) => (
        <div>
          <div>{bus?.name} ({bus?.number})</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{bus?.from} ➔ {bus?.to}</div>
        </div>
      ),
    },
    {
      title: "Khởi hành",
      dataIndex: "bus",
      key: "journeyDate",
      render: (bus) => (
        <div>
          <div>{bus?.journeyDate}</div>
          <div style={{ fontSize: 12, color: "#16a34a" }}>{bus?.departure}</div>
        </div>
      ),
    },
    {
      title: "Ghế đặt",
      dataIndex: "seats",
      key: "seats",
      render: (seats) => <Tag color="blue">{seats.join(", ")}</Tag>,
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount, record) => (
        <b>{Number(amount || record.bus?.fare * record.seats.length).toLocaleString("vi-VN")} VNĐ</b>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        if (status === "Boarded") return <Tag color="cyan">Đã lên xe</Tag>;
        if (status === "Cancelled") return <Tag color="red">Đã hủy</Tag>;
        return <Tag color="green">Đã thanh toán</Tag>;
      },
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      render: (text, record) => (
        <div className="d-flex gap-2">
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setSelectedBooking(record);
              setShowPrintModal(true);
            }}
          >
            In vé / QR
          </Button>

          {record.status === "Paid" && (
            <Popconfirm
              title="Bạn có chắc muốn hủy vé của khách hàng này?"
              okText="Đồng ý hủy"
              cancelText="Không"
              onConfirm={() => handleCancelBooking(record.id || record._id)}
            >
              <Button size="small" danger>
                Hủy vé
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageTitle title="Quản lý toàn bộ vé đã đặt (Admin)" />
      <div className="card p-3 shadow-sm mt-3" style={{ borderRadius: 10 }}>
        <Table columns={columns} dataSource={bookings} rowKey="id" />
      </div>

      {showPrintModal && selectedBooking && (
        <Modal
          title="Vé xe điện tử & Mã QR"
          onCancel={() => {
            setShowPrintModal(false);
            setSelectedBooking(null);
          }}
          visible={showPrintModal}
          okText="In vé / Lưu PDF"
          cancelText="Đóng"
          onOk={handlePrint}
          width={600}
        >
          <div className="p-4" ref={componentRef} style={{ border: "2px dashed #94a3b8", borderRadius: 12, background: "#fafafa" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 style={{ color: "#1e3a8a", fontWeight: 800, margin: 0 }}>NHA XE PHUONG NAM</h2>
                <p className="text-muted text-sm mb-0">Vé xe khách điện tử</p>
              </div>
              <div className="text-right">
                <Tag color={selectedBooking.status === "Boarded" ? "cyan" : selectedBooking.status === "Cancelled" ? "red" : "green"} style={{ fontSize: 13, padding: "3px 10px" }}>
                  {selectedBooking.status === "Boarded" ? "ĐÃ LÊN XE" : selectedBooking.status === "Cancelled" ? "ĐÃ HỦY VÉ" : "HỢP LỆ (ĐÃ THANH TOÁN)"}
                </Tag>
              </div>
            </div>
            <hr />

            <div className="d-flex justify-content-between my-3">
              <div style={{ flex: 1 }}>
                <p className="mb-1"><b>Mã vé:</b> <span style={{ color: "#2563eb", fontWeight: 700 }}>{selectedBooking.ticketCode || `NXPN-${selectedBooking.id}`}</span></p>
                <p className="mb-1"><b>Hành khách:</b> {selectedBooking.passengerName || selectedBooking.user?.name}</p>
                <p className="mb-1"><b>Số điện thoại:</b> {selectedBooking.passengerPhone || selectedBooking.user?.phone}</p>
                <p className="mb-1"><b>Tuyến xe:</b> {selectedBooking.bus?.from} ➔ {selectedBooking.bus?.to}</p>
                <p className="mb-1"><b>Tên xe / Biển số:</b> {selectedBooking.bus?.name} ({selectedBooking.bus?.number})</p>
                <p className="mb-1"><b>Ngày khởi hành:</b> {selectedBooking.bus?.journeyDate}</p>
                <p className="mb-1"><b>Giờ xuất bến:</b> {selectedBooking.bus?.departure}</p>
                <p className="mb-1"><b>Vị trí ghế:</b> <Tag color="blue">{selectedBooking.seats.join(", ")}</Tag></p>
                <p className="mb-0"><b>Tổng thanh toán:</b> <span style={{ color: "#e11d48", fontWeight: 700 }}>{Number(selectedBooking.totalAmount || selectedBooking.bus?.fare * selectedBooking.seats.length).toLocaleString("vi-VN")} VNĐ</span></p>
              </div>

              {/* QR Code */}
              <div className="text-center ml-3" style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    ticketCode: selectedBooking.ticketCode || `NXPN-${selectedBooking.id}`,
                    bookingId: selectedBooking.id,
                    bus: selectedBooking.bus?.number,
                    seats: selectedBooking.seats,
                    passenger: selectedBooking.passengerName || selectedBooking.user?.name,
                  })}
                  size={140}
                />
                <p className="text-muted text-xs mt-2 mb-0">Quét mã khi lên xe</p>
              </div>
            </div>

            <hr />
            <p className="text-center text-muted text-xs mb-0">
              Cảm ơn quý khách đã tin tưởng và đồng hành cùng Nha Xe Phuong Nam! Chúc quý khách một chuyến đi an toàn & thuận lợi.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminBookings;
