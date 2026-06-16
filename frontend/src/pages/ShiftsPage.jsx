import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

export default function ShiftsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/shifts?page=${page}&page_size=${pageSize}`);
        setRows(response.data);
      } catch (err) {
        setError(parseApiError(err));
      }
    };
    load();
  }, [page]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isShiftActive = (startTimeStr, endTimeStr) => {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;

    const start = String(startTimeStr).slice(0, 8);
    const end = String(endTimeStr).slice(0, 8);

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Ca trực qua nửa đêm (ví dụ 22:00:00 - 06:00:00)
      return currentTime >= start || currentTime <= end;
    }
  };

  return (
    <section className="panel">
      <h2>Ca làm việc</h2>
      {error && <p className="error-msg">{error}</p>}
      <div className="inline-form">
        <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
        <span className="muted">Trang {page}</span>
        <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Sau</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Start</th><th>End</th><th>Capacity</th><th>Staff only</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.shift_id}>
                <td>{row.shift_id}</td>
                <td>{row.shift_type}</td>
                <td>{String(row.start_time).slice(0, 8)}</td>
                <td>{String(row.end_time).slice(0, 8)}</td>
                <td>{row.capacity}</td>
                <td>
                  <span className={`status-badge ${isShiftActive(row.start_time, row.end_time) ? "status-active" : "status-inactive"}`}>
                    {isShiftActive(row.start_time, row.end_time) ? "true" : "false"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

