import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { axiosInstance } from "../helpers/axiosInstance";
import { HideLoading, ShowLoading } from "../redux/alertsSlice";
import { message, Select, Tag, Row, Col, Button } from "antd";
import PageTitle from "../components/PageTitle";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom Leaflet bus icon
const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

function BusTracking() {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.users);
  const isStaff = user?.role === "Staff";

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const queryBusId = searchParams.get("busId");

  const getBuses = async () => {
    try {
      dispatch(ShowLoading());
      const response = await axiosInstance.post("/api/buses/get-all-buses", {});
      dispatch(HideLoading());
      if (response.data.success) {
        setBuses(response.data.data);
        if (queryBusId) {
          setSelectedBusId(Number(queryBusId));
        } else if (response.data.data.length > 0) {
          setSelectedBusId(response.data.data[0].id || response.data.data[0]._id);
        }
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

  // Initialize Map
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current).setView([10.7769, 106.7009], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when buses or selectedBusId changes
  useEffect(() => {
    if (!mapInstanceRef.current || buses.length === 0) return;

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    let targetLat = 10.7769;
    let targetLng = 106.7009;

    buses.forEach((bus) => {
      const lat = bus.currentLatitude || 10.7769;
      const lng = bus.currentLongitude || 106.7009;
      const isSelected = (bus.id || bus._id) === selectedBusId;

      if (isSelected) {
        targetLat = lat;
        targetLng = lng;
      }

      const marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);

      const popupContent = `
        <div style="min-width: 180px;">
          <h4 style="margin: 0; color: #1e3a8a; font-weight: bold;">
            ${bus.name} (${bus.number})
          </h4>
          <p style="margin: 4px 0; font-size: 12px;"><b>Tuyến:</b> ${bus.from} ➔ ${bus.to}</p>
          <p style="margin: 4px 0; font-size: 12px;"><b>Khởi hành:</b> ${bus.departure} (${bus.journeyDate})</p>
          <p style="margin: 4px 0; font-size: 12px;"><b>Loại xe:</b> ${bus.type} (${bus.capacity} chỗ)</p>
          <p style="margin: 4px 0; font-size: 12px;"><b>Tọa độ:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
          <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
            ${bus.status || "Đang hoạt động"}
          </span>
        </div>
      `;

      marker.bindPopup(popupContent);
      if (isSelected) {
        marker.openPopup();
      }

      markersRef.current.push(marker);
    });

    // Pan map to selected bus
    map.setView([targetLat, targetLng], 13);
  }, [buses, selectedBusId]);

  const selectedBus = buses.find((b) => (b.id || b._id) === selectedBusId) || buses[0];

  return (
    <div>
      <PageTitle title="Theo dõi trực tuyến vị trí xe khách (GPS Real-time)" />

      {!isStaff && (
        <div className="card p-3 shadow-sm my-3" style={{ borderRadius: 10 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col lg={8} sm={24} xs={24}>
              <label className="text-sm font-semibold text-gray-700">Chọn chuyến xe cần theo dõi:</label>
              <Select
                style={{ width: "100%" }}
                placeholder="Chọn chuyến xe"
                value={selectedBusId}
                onChange={(value) => setSelectedBusId(value)}
              >
                {buses.map((b) => (
                  <Select.Option key={b.id || b._id} value={b.id || b._id}>
                    {b.name} ({b.number}) - {b.from} ➔ {b.to}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col lg={12} sm={24} xs={24}>
              {selectedBus && (
                <div className="d-flex align-items-center gap-3">
                  <div>
                    <span className="text-muted text-xs">Tuyến đường:</span>
                    <div className="font-semibold">{selectedBus.from} ➔ {selectedBus.to}</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Giờ xuất bến:</span>
                    <div className="font-semibold">{selectedBus.departure}</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Trạng thái:</span>
                    <div>
                      <Tag color={selectedBus.status === "Running" ? "green" : "blue"}>
                        {selectedBus.status || "Đang hành trình"}
                      </Tag>
                    </div>
                  </div>
                </div>
              )}
            </Col>

            <Col lg={4} sm={24} xs={24} className="text-right">
              <Button type="primary" icon={<i className="ri-refresh-line mr-1"></i>} onClick={getBuses}>
                Cập nhật GPS
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* Map Container */}
      <div className="card p-2 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
        <div
          ref={mapRef}
          style={{ height: "550px", width: "100%", borderRadius: 10 }}
        />
      </div>
    </div>
  );
}

export default BusTracking;
