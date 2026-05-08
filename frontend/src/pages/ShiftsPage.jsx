import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

export default function ShiftsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

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

  return (
    <section className="panel">
      <h2>Shifts</h2>
      {error && <p className="error-msg">{error}</p>}
      <div className="inline-form">
        <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span className="muted">Page {page}</span>
        <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
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
                <td>{String(row.is_for_staff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
