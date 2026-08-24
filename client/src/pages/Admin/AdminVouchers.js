import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { message, Table, Tag, Button, Modal, Form, Input, InputNumber, Switch, Popconfirm, Row, Col } from "antd";
import PageTitle from "../../components/PageTitle";

function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const getVouchers = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/vouchers/get-all-vouchers", {});
      dispatch(HideLoading());
      if (response.data.success) {
        setVouchers(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleSaveVoucher = async (values) => {
    try {
      dispatch(ShowLoading());
      let response = null;
      if (selectedVoucher) {
        response = await axiosInstance.post("/api/vouchers/update-voucher", {
          ...values,
          _id: selectedVoucher.id || selectedVoucher._id,
        });
      } else {
        response = await axiosInstance.post("/api/vouchers/add-voucher", values);
      }
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        setShowModal(false);
        setSelectedVoucher(null);
        form.resetFields();
        getVouchers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/vouchers/delete-voucher", {
        _id: id,
        id: id,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getVouchers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleToggleActive = async (voucher) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/vouchers/update-voucher", {
        _id: voucher.id || voucher._id,
        isActive: !voucher.isActive,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getVouchers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getVouchers();
  }, []);

  const columns = [
    {
      title: "Mã giảm giá",
      dataIndex: "code",
      key: "code",
      render: (code) => <b className="text-primary" style={{ fontSize: 15 }}>{code}</b>,
    },
    {
      title: "Mức giảm",
      key: "discount",
      render: (text, record) => {
        if (record.discountPercent > 0) {
          return <Tag color="green" style={{ fontSize: 13 }}>Giảm {record.discountPercent}%</Tag>;
        }
        return <Tag color="blue" style={{ fontSize: 13 }}>Giảm {Number(record.discountAmount).toLocaleString("vi-VN")} VNĐ</Tag>;
      },
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minOrderAmount",
      key: "minOrderAmount",
      render: (amount) => `${Number(amount).toLocaleString("vi-VN")} VNĐ`,
    },
    {
      title: "Lượt sử dụng",
      key: "usage",
      render: (text, record) => (
        <span>
          {record.usedCount} / {record.maxUsage} lượt
        </span>
      ),
    },
    {
      title: "Hạn sử dụng",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (active, record) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      render: (text, record) => (
        <div className="d-flex gap-2">
          <Button
            size="small"
            icon={<i className="ri-pencil-line"></i>}
            onClick={() => {
              setSelectedVoucher(record);
              form.setFieldsValue({
                ...record,
                expiryDate: record.expiryDate ? new Date(record.expiryDate).toISOString().split("T")[0] : "",
              });
              setShowModal(true);
            }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa mã giảm giá này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id || record._id)}
          >
            <Button size="small" danger icon={<i className="ri-delete-bin-line"></i>} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <PageTitle title="Quản lý Mã giảm giá & Khuyến mãi (Vouchers)" />
        <button
          className="primary-btn"
          onClick={() => {
            setSelectedVoucher(null);
            form.resetFields();
            setShowModal(true);
          }}
        >
          <i className="ri-coupon-line mr-1"></i> Tạo mã giảm giá mới
        </button>
      </div>

      <div className="card p-3 shadow-sm" style={{ borderRadius: 10 }}>
        <Table columns={columns} dataSource={vouchers} rowKey="id" />
      </div>

      {/* Add / Edit Voucher Modal */}
      <Modal
        title={selectedVoucher ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá mới"}
        visible={showModal}
        onCancel={() => {
          setShowModal(false);
          setSelectedVoucher(null);
        }}
        footer={null}
        width={600}
      >
        <Form layout="vertical" form={form} onFinish={handleSaveVoucher}>
          <Form.Item label="Mã khuyến mãi (Code) (*)" name="code" rules={[{ required: true, message: "Nhập mã code" }]}>
            <Input placeholder="VD: PHUONGNAM20" style={{ textTransform: "uppercase" }} />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item label="Giảm theo % (0 - 100)" name="discountPercent" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder="10" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hoặc giảm cố định (VNĐ)" name="discountAmount" initialValue={0}>
                <InputNumber min={0} step={5000} style={{ width: "100%" }} placeholder="50000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item label="Đơn hàng tối thiểu (VNĐ)" name="minOrderAmount" initialValue={0}>
                <InputNumber min={0} step={10000} style={{ width: "100%" }} placeholder="100000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Số lượt sử dụng tối đa" name="maxUsage" initialValue={100}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Hạn sử dụng (*)" name="expiryDate" rules={[{ required: true, message: "Chọn hạn dùng" }]}>
            <input type="date" style={{ width: "100%", padding: "6px 12px", border: "1px solid #d9d9d9", borderRadius: 4 }} />
          </Form.Item>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button onClick={() => setShowModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu mã giảm giá
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminVouchers;
