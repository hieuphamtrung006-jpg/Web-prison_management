import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

const initialForm = {
  location_name: "",
  type: "Cell",
  capacity: 4,
  security_level: "Medium",
  is_active: true,
};

export default function LocationsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/locations");
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/locations", { ...form, capacity: Number(form.capacity) });
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>Locations and occupancy</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.location_id}>
                  <td>{row.location_name}</td>
                  <td>{row.type}</td>
                  <td>{row.capacity}</td>
                  <td>{row.current_occupancy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Create location</h2>
        <form className="form-grid" onSubmit={create}>
          <label>Name<input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} required /></label>
          <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Cell</option><option>Workshop</option><option>Dining</option><option>Yard</option><option>Hospital</option></select></label>
          <label>Capacity<input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></label>
          <label>Security<input value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Create</button>
        </form>
      </section>
    </div>
  );
}
