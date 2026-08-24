import React, { useState, useEffect } from "react";
import { Col, Form, message, Modal, Row, Select, Input, Button, Card, Divider } from "antd";
import { axiosInstance } from "../helpers/axiosInstance";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";

function BusForm({
  showBusForm,
  setShowBusForm,
  type = "add",
  getData,
  selectedBus,
  setSelectedBus,
}) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [staffUsers, setStaffUsers] = useState([]);

  // Default multi-stop template
  const [stops, setStops] = useState([
    { name: "Hồ Chí Minh", arrivalTime: "", departureTime: "08:00", fare: 0 },
    { name: "Phan Thiết", arrivalTime: "11:00", departureTime: "11:15", fare: 150000 },
    { name: "Đà Lạt", arrivalTime: "15:30", departureTime: "", fare: 320000 },
  ]);

  // Fetch all staff accounts for Admin assignment dropdown
  const getStaffUsers = async () => {
    try {
      const res = await axiosInstance.post("/api/users/get-all-users", {});
      if (res.data.success) {
        const staff = res.data.data.filter((u) => u.role === "Staff");
        setStaffUsers(staff);
      }
    } catch (e) {}
  };

  useEffect(() => {
    getStaffUsers();
  }, []);

  useEffect(() => {
    if (selectedBus) {
      if (selectedBus.stops && selectedBus.stops.length >= 2) {
        setStops(selectedBus.stops);
      } else {
        setStops([
          { name: selectedBus.from || "Hồ Chí Minh", arrivalTime: "", departureTime: selectedBus.departure || "08:00", fare: 0 },
          { name: selectedBus.to || "Đà Lạt", arrivalTime: selectedBus.arrival || "15:00", departureTime: "", fare: selectedBus.fare || 250000 },
        ]);
      }
      form.setFieldsValue({
        ...selectedBus,
        name: selectedBus.name?.startsWith("Nhà xe Phương Nam - ")
          ? selectedBus.name.replace("Nhà xe Phương Nam - ", "")
          : selectedBus.name,
        driverId: selectedBus.driverId || null,
      });
    } else {
      setStops([
        { name: "Hồ Chí Minh", arrivalTime: "", departureTime: "08:00", fare: 0 },
        { name: "Bảo Lộc", arrivalTime: "12:00", departureTime: "12:15", fare: 180000 },
        { name: "Đà Lạt", arrivalTime: "15:30", departureTime: "", fare: 320000 },
      ]);
      form.resetFields();
    }
  }, [selectedBus, form]);

  const handleAddStop = () => {
    setStops([
      ...stops,
      { name: "", arrivalTime: "", departureTime: "", fare: stops[stops.length - 1]?.fare || 0 },
    ]);
  };

  const handleRemoveStop = (index) => {
    if (stops.length <= 2) {
      message.warning("Tuyến xe phải có ít nhất 2 trạm (Điểm xuất phát và Điểm kết thúc)!");
      return;
    }
    const updated = stops.filter((_, i) => i !== index);
    setStops(updated);
  };

  const handleStopChange = (index, field, value) => {
    const updated = [...stops];
    updated[index][field] = field === "fare" ? Number(value) || 0 : value;
    setStops(updated);
  };

  const onFinish = async (values) => {
    // Validate stops
    for (let i = 0; i < stops.length; i++) {
      if (!stops[i].name.trim()) {
        message.warning(`Vui lòng nhập tên cho trạm dừng thứ ${i + 1}!`);
        return;
      }
    }

    // Always prefix brand name
    const rawName = values.name.trim();
    const finalName = rawName.startsWith("Nhà xe Phương Nam - ")
      ? rawName
      : `Nhà xe Phương Nam - ${rawName}`;

    const fromCity = stops[0].name;
    const toCity = stops[stops.length - 1].name;
    const departure = stops[0].departureTime || values.departure || "08:00";
    const arrival = stops[stops.length - 1].arrivalTime || values.arrival || "17:00";
    const fullFare = stops[stops.length - 1].fare || Number(values.fare) || 200000;

    // Find driver name from selected driverId
    let driverName = "";
    if (values.driverId) {
      const selectedStaff = staffUsers.find((s) => s.id === values.driverId || s._id === values.driverId);
      if (selectedStaff) {
        driverName = selectedStaff.name;
      }
    }

    const payload = {
      ...values,
      name: finalName,
      from: fromCity,
      to: toCity,
      departure: departure,
      arrival: arrival,
      fare: fullFare,
      stops: stops,
      driverId: values.driverId || null,
      driverName: driverName,
    };

    try {
      dispatch(ShowLoading());
      let response = null;
      if (type === "add") {
        response = await axiosInstance.post("/api/buses/add-bus", payload);
      } else {
        response = await axiosInstance.post("/api/buses/update-bus", {
          ...payload,
          _id: selectedBus._id || selectedBus.id,
        });
      }
      if (response.data.success) {
        message.success(response.data.message);
        getData();
        setShowBusForm(false);
        setSelectedBus(null);
      } else {
        message.error(response.data.message);
      }
      dispatch(HideLoading());
    } catch (error) {
      message.error(error.message);
      dispatch(HideLoading());
    }
  };

  return (
    <Modal
      width={860}
      title={
        <div style={{ color: "#1e3a8a", fontWeight: 700, fontSize: 18 }}>
          <i className="ri-bus-fill mr-2"></i>
          {type === "add" ? "Thêm tuyến xe Nha Xe Phuong Nam mới" : "Cập nhật tuyến xe Nha Xe Phuong Nam"}
        </div>
      }
      visible={showBusForm}
      onCancel={() => {
        setSelectedBus(null);
        setShowBusForm(false);
      }}
      footer={false}
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Row gutter={[16, 16]}>
          <Col lg={16} xs={24}>
            <Form.Item
              label="Tên lộ trình chuyến xe (*)"
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập tên tuyến" }]}
              extra="Hệ thống tự động gán thương hiệu: 'Nha Xe Phuong Nam - Tên lộ trình'"
            >
              <Input
                addonBefore="Nha Xe Phuong Nam -"
                placeholder="VD: Sài Gòn → Đà Lạt VIP Limousine"
              />
            </Form.Item>
          </Col>
          <Col lg={8} xs={24}>
            <Form.Item label="Biển số / Số hiệu xe (*)" name="number" rules={[{ required: true }]}>
              <Input placeholder="VD: 51B-888.88" />
            </Form.Item>
          </Col>

          <Col lg={8} xs={24}>
            <Form.Item label="Sức chứa (Số ghế) (*)" name="capacity" rules={[{ required: true }]}>
              <Input type="number" placeholder="VD: 34" />
            </Form.Item>
          </Col>
          <Col lg={8} xs={24}>
            <Form.Item label="Ngày khởi hành (*)" name="journeyDate" rules={[{ required: true }]}>
              <input
                type="date"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </Form.Item>
          </Col>
          <Col lg={8} xs={24}>
            <Form.Item label="Loại xe" name="type" initialValue="Limousine Giường nằm">
              <Select style={{ height: 40 }}>
                <Select.Option value="Limousine Giường nằm">Limousine Giường nằm</Select.Option>
                <Select.Option value="Giường nằm VIP">Giường nằm VIP</Select.Option>
                <Select.Option value="Ghế ngồi cao cấp">Ghế ngồi cao cấp</Select.Option>
                <Select.Option value="Ghế ngồi tiêu chuẩn">Ghế ngồi tiêu chuẩn</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          {/* Admin Staff Assignment Dropdown */}
          <Col lg={12} xs={24}>
            <Form.Item
              label="Tài xế / Phụ xe phụ trách (*)"
              name="driverId"
              rules={[{ required: true, message: "Vui lòng chỉ định nhân viên phụ trách" }]}
              extra="Chỉ Admin mới có quyền phân công nhân viên cho chuyến xe này."
            >
              <Select placeholder="Chọn Tài xế / Phụ xe phụ trách" style={{ height: 40 }}>
                {staffUsers.map((s) => (
                  <Select.Option key={s.id || s._id} value={s.id || s._id}>
                    {s.name} ({s.phone || s.email})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col lg={12} xs={24}>
            <Form.Item label="Trạng thái hành trình" name="status" initialValue="Yet To Start">
              <Select style={{ height: 40 }}>
                <Select.Option value="Yet To Start">⚪ Chưa khởi hành (Yet To Start)</Select.Option>
                <Select.Option value="Running">🟢 Đang chạy (Running)</Select.Option>
                <Select.Option value="Stopping">🟡 Tạm dừng / Nghỉ chân (Stopping)</Select.Option>
                <Select.Option value="Completed">🔴 Đã đến nơi (Completed)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Dynamic Multi-Stop Sequence Editor */}
        <Divider orientation="left" style={{ margin: "16px 0 12px 0", color: "#1e3a8a", fontWeight: 700 }}>
          <i className="ri-route-line mr-1"></i> Danh sách các trạm dừng dọc hành trình (Lộ trình di chuyển)
        </Divider>

        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
          {stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stops.length - 1;

            return (
              <Card
                key={idx}
                size="small"
                className="mb-2"
                style={{
                  borderLeft: isFirst ? "4px solid #16a34a" : isLast ? "4px solid #dc2626" : "4px solid #2563eb",
                  borderRadius: 8,
                }}
              >
                <Row gutter={[10, 10]} align="middle">
                  <Col lg={2} xs={4} className="text-center">
                    <span
                      style={{
                        background: isFirst ? "#16a34a" : isLast ? "#dc2626" : "#2563eb",
                        color: "#fff",
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {idx + 1}
                    </span>
                  </Col>

                  <Col lg={7} xs={20}>
                    <label className="text-xs font-semibold text-muted">
                      {isFirst ? "Điểm xuất phát (*)" : isLast ? "Điểm đến cuối (*)" : `Trạm trung gian ${idx} (*)`}
                    </label>
                    <input
                      type="text"
                      placeholder="VD: TP. Hồ Chí Minh"
                      value={stop.name}
                      onChange={(e) => handleStopChange(idx, "name", e.target.value)}
                      style={{ height: 36, fontSize: 13 }}
                    />
                  </Col>

                  <Col lg={4} xs={12}>
                    <label className="text-xs font-semibold text-muted">Giờ đến</label>
                    <input
                      type="time"
                      disabled={isFirst}
                      value={stop.arrivalTime}
                      onChange={(e) => handleStopChange(idx, "arrivalTime", e.target.value)}
                      style={{ height: 36, fontSize: 13, background: isFirst ? "#e2e8f0" : "#fff" }}
                    />
                  </Col>

                  <Col lg={4} xs={12}>
                    <label className="text-xs font-semibold text-muted">Giờ xuất phát</label>
                    <input
                      type="time"
                      disabled={isLast}
                      value={stop.departureTime}
                      onChange={(e) => handleStopChange(idx, "departureTime", e.target.value)}
                      style={{ height: 36, fontSize: 13, background: isLast ? "#e2e8f0" : "#fff" }}
                    />
                  </Col>

                  <Col lg={5} xs={18}>
                    <label className="text-xs font-semibold text-muted">
                      Giá từ điểm đầu (VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={isFirst}
                      placeholder="0"
                      value={stop.fare}
                      onChange={(e) => handleStopChange(idx, "fare", e.target.value)}
                      style={{ height: 36, fontSize: 13, background: isFirst ? "#e2e8f0" : "#fff" }}
                    />
                  </Col>

                  <Col lg={2} xs={6} className="text-right">
                    {!isFirst && stops.length > 2 && (
                      <Button
                        type="text"
                        danger
                        icon={<i className="ri-delete-bin-line" style={{ fontSize: 16 }}></i>}
                        onClick={() => handleRemoveStop(idx)}
                        title="Xóa trạm này"
                      />
                    )}
                  </Col>
                </Row>
              </Card>
            );
          })}

          <Button
            type="dashed"
            block
            icon={<i className="ri-add-line mr-1"></i>}
            onClick={handleAddStop}
            style={{ borderRadius: 8, height: 38, fontWeight: 600, color: "#2563eb", borderColor: "#93c5fd" }}
          >
            Thêm trạm dừng trung gian
          </Button>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
          <button className="secondary-btn" type="button" onClick={() => setShowBusForm(false)}>
            Hủy
          </button>
          <button className="primary-btn" type="submit">
            <i className="ri-save-line mr-1"></i> Lưu tuyến xe Nha Xe Phuong Nam
          </button>
        </div>
      </Form>
    </Modal>
  );
}

export default BusForm;
