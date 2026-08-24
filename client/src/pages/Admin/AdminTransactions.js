import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { axiosInstance } from "../../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../../redux/alertsSlice";
import { message, Table, Tag, Row, Col, Card, Select, Button } from "antd";
import PageTitle from "../../components/PageTitle";

function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulCount: 0,
    refundedCount: 0,
  });
  const [filters, setFilters] = useState({
    transactionId: "",
    status: "",
    paymentMethod: "",
    startDate: "",
    endDate: "",
  });
  const dispatch = useDispatch();

  const getTransactions = async () => {
    const cleanFilters = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key]) cleanFilters[key] = filters[key];
    });

    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/transactions/get-all-transactions", cleanFilters);
      dispatch(HideLoading());
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setSummary(response.data.data.summary);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getTransactions();
  }, []);

  // Export to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      message.warning("Không có dữ liệu để xuất báo cáo!");
      return;
    }
    const headers = "ID,Mã Giao Dịch,Mã Vé,Khách Hàng,Email,SĐT,Tuyến Xe,Số Tiền (VNĐ),Phương Thức,Trạng Thái,Thời Gian\n";
    const rows = transactions
      .map((t) =>
        [
          t.id,
          t.transactionId,
          t.ticketCode || "N/A",
          `"${t.userName || ""}"`,
          t.userEmail || "",
          t.userPhone || "",
          `"${(t.fromCity || "") + " - " + (t.toCity || "")}"`,
          t.amount,
          t.paymentMethod,
          t.status,
          new Date(t.createdAt).toLocaleString("vi-VN"),
        ].join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_GiaoDich_NhaXePhuongNam_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Đã xuất báo cáo CSV thành công!");
  };

  const columns = [
    {
      title: "Mã giao dịch",
      dataIndex: "transactionId",
      key: "transactionId",
      render: (id) => <b className="text-primary">{id}</b>,
    },
    {
      title: "Mã vé",
      dataIndex: "ticketCode",
      key: "ticketCode",
      render: (code) => code || <span className="text-muted">N/A</span>,
    },
    {
      title: "Khách hàng",
      dataIndex: "userName",
      key: "userName",
      render: (name, record) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{record.userPhone || record.userEmail}</div>
        </div>
      ),
    },
    {
      title: "Tuyến xe",
      key: "route",
      render: (text, record) => (
        <span>{record.fromCity ? `${record.fromCity} ➔ ${record.toCity}` : "N/A"}</span>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <b style={{ color: amount > 0 ? "#16a34a" : "#dc2626" }}>
          {Number(amount).toLocaleString("vi-VN")} VNĐ
        </b>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method) => <Tag color="blue">{method}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        if (status === "Success") return <Tag color="green">Thành công</Tag>;
        if (status === "Refunded") return <Tag color="orange">Đã hoàn tiền</Tag>;
        return <Tag color="red">Thất bại</Tag>;
      },
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <PageTitle title="Nhật ký giao dịch & Đối soát tài chính" />
        <Button type="primary" icon={<i className="ri-file-excel-2-line mr-1"></i>} onClick={handleExportCSV}>
          Xuất báo cáo (CSV)
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col lg={6} sm={12} xs={24}>
          <div className="card p-3 shadow-sm text-center" style={{ borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="text-muted text-sm mb-1">Tổng doanh thu thực</p>
            <h2 className="font-bold text-success mb-0">{summary.totalRevenue.toLocaleString("vi-VN")} VNĐ</h2>
          </div>
        </Col>
        <Col lg={6} sm={12} xs={24}>
          <div className="card p-3 shadow-sm text-center" style={{ borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <p className="text-muted text-sm mb-1">Tổng số giao dịch</p>
            <h2 className="font-bold text-primary mb-0">{summary.totalTransactions}</h2>
          </div>
        </Col>
        <Col lg={6} sm={12} xs={24}>
          <div className="card p-3 shadow-sm text-center" style={{ borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-muted text-sm mb-1">Giao dịch thành công</p>
            <h2 className="font-bold text-gray-800 mb-0">{summary.successfulCount}</h2>
          </div>
        </Col>
        <Col lg={6} sm={12} xs={24}>
          <div className="card p-3 shadow-sm text-center" style={{ borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <p className="text-muted text-sm mb-1">Hoàn tiền / Hủy vé</p>
            <h2 className="font-bold text-warning mb-0">{summary.refundedCount}</h2>
          </div>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <div className="card p-3 shadow-sm mb-3" style={{ borderRadius: 10 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col lg={6} sm={12} xs={24}>
            <label className="text-xs font-semibold text-gray-600">Mã giao dịch</label>
            <input
              type="text"
              placeholder="Tìm theo mã TXN..."
              value={filters.transactionId}
              onChange={(e) => setFilters({ ...filters, transactionId: e.target.value })}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
          </Col>
          <Col lg={4} sm={12} xs={24}>
            <label className="text-xs font-semibold text-gray-600">Trạng thái</label>
            <Select
              style={{ width: "100%" }}
              placeholder="Tất cả"
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val })}
              allowClear
            >
              <Select.Option value="Success">Thành công</Select.Option>
              <Select.Option value="Refunded">Đã hoàn tiền</Select.Option>
              <Select.Option value="Failed">Thất bại</Select.Option>
            </Select>
          </Col>
          <Col lg={5} sm={12} xs={24}>
            <label className="text-xs font-semibold text-gray-600">Từ ngày</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
          </Col>
          <Col lg={5} sm={12} xs={24}>
            <label className="text-xs font-semibold text-gray-600">Đến ngày</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
          </Col>
          <Col lg={4} sm={24} xs={24} className="d-flex gap-2 align-items-end" style={{ paddingTop: 18 }}>
            <Button type="primary" onClick={getTransactions} className="flex-1">
              Lọc
            </Button>
            <Button
              onClick={() => {
                setFilters({ transactionId: "", status: "", paymentMethod: "", startDate: "", endDate: "" });
                getTransactions();
              }}
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </div>

      <div className="card p-3 shadow-sm" style={{ borderRadius: 10 }}>
        <Table columns={columns} dataSource={transactions} rowKey="id" />
      </div>
    </div>
  );
}

export default AdminTransactions;
