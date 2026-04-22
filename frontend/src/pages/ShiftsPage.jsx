import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

export default function ShiftsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/shifts");
        setRows(response.data);
      } catch (err) {
        setError(parseApiError(err));
      }
    };
    load();
  }, []);

  return (
    <section className="panel">
      <h2>Shifts</h2>
      {error && <p className="error-msg">{error}</p>}
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
