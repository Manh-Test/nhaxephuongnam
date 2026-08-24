import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { message, Table, Tag, Button, Modal, Form, Select, Input, Popconfirm } from "antd";
import PageTitle from "../../components/PageTitle";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const getUsers = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/get-all-users", {});
      dispatch(HideLoading());
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/update-user-permissions", {
        _id: user.id || user._id,
        role: newRole,
        isAdmin: newRole === "Admin",
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getUsers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/update-user-permissions", {
        _id: user.id || user._id,
        isBlocked: !user.isBlocked,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getUsers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/delete-user", {
        id: userId,
      });
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        getUsers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/users/add-user", values);
      dispatch(HideLoading());
      if (response.data.success) {
        message.success(response.data.message);
        setShowAddModal(false);
        form.resetFields();
        getUsers();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const columns = [
    {
      title: "Họ và tên",
      dataIndex: "name",
      key: "name",
      render: (name) => <b>{name}</b>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => phone || <span className="text-muted">Chưa cập nhật</span>,
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role, record) => {
        let color = "blue";
        let label = "Khách hàng";
        if (role === "Admin" || record.isAdmin) {
          color = "gold";
          label = "Quản lý (Admin)";
        } else if (role === "Staff") {
          color = "purple";
          label = "Nhân viên xe";
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isBlocked",
      key: "isBlocked",
      render: (isBlocked) => (
        <Tag color={isBlocked ? "red" : "green"}>
          {isBlocked ? "Đang bị khóa" : "Hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      render: (text, record) => (
        <div className="d-flex gap-2 align-items-center">
          <Select
            size="small"
            value={record.role || (record.isAdmin ? "Admin" : "Customer")}
            style={{ width: 130 }}
            onChange={(newRole) => handleUpdateRole(record, newRole)}
          >
            <Select.Option value="Customer">Khách hàng</Select.Option>
            <Select.Option value="Staff">Nhân viên xe</Select.Option>
            <Select.Option value="Admin">Quản lý (Admin)</Select.Option>
          </Select>

          <Button
            size="small"
            type={record.isBlocked ? "primary" : "default"}
            danger={!record.isBlocked}
            onClick={() => handleToggleBlock(record)}
          >
            {record.isBlocked ? "Mở khóa" : "Khóa"}
          </Button>

          <Popconfirm
            title="Bạn có chắc muốn xóa tài khoản này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteUser(record.id || record._id)}
          >
            <Button size="small" type="text" danger icon={<i className="ri-delete-bin-line"></i>} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <PageTitle title="Quản lý Tài khoản & Phân quyền" />
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          <i className="ri-user-add-line mr-1"></i> Thêm tài khoản mới
        </button>
      </div>

      <div className="card p-3 shadow-sm" style={{ borderRadius: 10 }}>
        <Table columns={columns} dataSource={users} rowKey="id" />
      </div>

      {/* Add User Modal */}
      <Modal
        title="Thêm tài khoản người dùng / Nhân viên mới"
        visible={showAddModal}
        onCancel={() => setShowAddModal(false)}
        footer={null}
      >
        <Form layout="vertical" form={form} onFinish={handleCreateUser}>
          <Form.Item label="Họ và tên" name="name" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}>
            <Input placeholder="Nguyễn Văn B" />
          </Form.Item>

          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Vui lòng nhập email hợp lệ" }]}>
            <Input placeholder="nhanvien@phuongnam.com" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: "Vui lòng nhập SĐT" }]}>
            <Input placeholder="0912345678" />
          </Form.Item>

          <Form.Item label="Mật khẩu khởi tạo" name="password" rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}>
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item label="Vai trò hệ thống" name="role" initialValue="Staff" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Customer">Khách hàng</Select.Option>
              <Select.Option value="Staff">Nhân viên xe (Tài xế / Phụ xe)</Select.Option>
              <Select.Option value="Admin">Quản lý (Admin)</Select.Option>
            </Select>
          </Form.Item>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu tài khoản
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminUsers;
