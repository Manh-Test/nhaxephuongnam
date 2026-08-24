import React, { useEffect, useState } from "react";
import { message, Table, Tag, Button, Popconfirm } from "antd";
import { useDispatch } from "react-redux";
import BusForm from "../../components/BusForm";
import PageTitle from "../../components/PageTitle";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";

function AdminBuses() {
  const dispatch = useDispatch();
  const [showBusForm, setShowBusForm] = useState(false);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);

  const getBuses = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/get-all-buses", {});
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

  const deleteBus = async (id) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/delete-bus", {
        _id: id,
        id: id,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getBuses();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const columns = [
    {
      title: "Tên tuyến / Xe",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <b>{name}</b>
          <div style={{ fontSize: 12, color: "#64748b" }}>Biển số: {record.number}</div>
        </div>
      ),
    },
    {
      title: "Lộ trình & Các trạm dừng",
      dataIndex: "from",
      key: "from",
      render: (from, record) => {
        const stops = record.stops && record.stops.length > 0 ? record.stops : [{ name: from }, { name: record.to }];
        return (
          <div style={{ maxWidth: 260 }}>
            <div style={{ fontWeight: 600, color: "#1e3a8a", fontSize: 13 }}>
              {from} ➔ {record.to}
            </div>
            {stops.length > 2 && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Trạm: {stops.map((s) => s.name).join(" ➔ ")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Khởi hành",
      dataIndex: "journeyDate",
      key: "journeyDate",
      render: (date, record) => (
        <div>
          <div>{date}</div>
          <div style={{ fontSize: 12, color: "#16a34a" }}>{record.departure} - {record.arrival}</div>
        </div>
      ),
    },
    {
      title: "Sức chứa & Chỗ",
      dataIndex: "capacity",
      key: "capacity",
      render: (cap, record) => {
        const booked = record.seatsBooked?.length || 0;
        return (
          <span>
            {booked} / {cap} ghế ({record.type})
          </span>
        );
      },
    },
    {
      title: "Giá vé",
      dataIndex: "fare",
      key: "fare",
      render: (fare) => <b>{Number(fare).toLocaleString("vi-VN")} VNĐ</b>,
    },
    {
      title: "Nhân viên xe",
      dataIndex: "driverName",
      key: "driverName",
      render: (driverName) => (
        driverName ? (
          <Tag color="geekblue" style={{ fontWeight: 600 }}>
            <i className="ri-steering-fill mr-1"></i> {driverName}
          </Tag>
        ) : (
          <span className="text-muted text-xs">Chưa phân công</span>
        )
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Running" ? "green" : status === "Stopping" ? "gold" : status === "Completed" ? "default" : status === "Cancelled" ? "red" : "blue"}>
          {status === "Running" ? "🟢 Đang chạy" : status === "Stopping" ? "🟡 Tạm dừng" : status === "Completed" ? "🔴 Đã xong" : status === "Cancelled" ? "⚫ Đã hủy" : "⚪ Chưa chạy"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      render: (action, record) => (
        <div className="d-flex gap-2">
          <Button
            size="small"
            icon={<i className="ri-pencil-line"></i>}
            disabled={record.status !== "Yet To Start"}
            title={record.status !== "Yet To Start" ? "Không thể sửa chuyến xe đã bắt đầu" : "Chỉnh sửa chuyến xe"}
            onClick={() => {
              setSelectedBus(record);
              setShowBusForm(true);
            }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa tuyến xe này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteBus(record.id || record._id)}
          >
            <Button
              size="small"
              danger
              disabled={!(["Yet To Start", "Completed"].includes(record.status))}
              icon={<i className="ri-delete-bin-line"></i>}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  useEffect(() => {
    getBuses();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <PageTitle title="Quản lý Tuyến xe & Lịch trình" />
        <button className="primary-btn" onClick={() => setShowBusForm(true)}>
          <i className="ri-add-line mr-1"></i> Thêm tuyến xe mới
        </button>
      </div>

      <div className="card p-3 shadow-sm" style={{ borderRadius: 10 }}>
        <Table columns={columns} dataSource={buses} rowKey="id" />
      </div>

      {showBusForm && (
        <BusForm
          showBusForm={showBusForm}
          setShowBusForm={setShowBusForm}
          type={selectedBus ? "edit" : "add"}
          selectedBus={selectedBus}
          setSelectedBus={setSelectedBus}
          getData={getBuses}
        />
      )}
    </div>
  );
}

export default AdminBuses;
