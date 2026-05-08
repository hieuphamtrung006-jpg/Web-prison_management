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
  const [updateForm, setUpdateForm] = useState({
    location_id: "",
    location_name: "",
    type: "",
    capacity: "",
    security_level: "",
    is_active: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/locations?page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, [page]);

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

  const update = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.location_id) {
      setError("Location ID is required");
      return;
    }

    const payload = {};
    if (updateForm.location_name) payload.location_name = updateForm.location_name;
    if (updateForm.type) payload.type = updateForm.type;
    if (updateForm.capacity) payload.capacity = Number(updateForm.capacity);
    if (updateForm.security_level) payload.security_level = updateForm.security_level;
    if (updateForm.is_active !== "") payload.is_active = updateForm.is_active === "true";

    try {
      await api.put(`/locations/${Number(updateForm.location_id)}`, payload);
      setUpdateForm({
        location_id: "",
        location_name: "",
        type: "",
        capacity: "",
        security_level: "",
        is_active: "",
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deleteLocation = async (locationId) => {
    const confirmed = window.confirm("Delete this location permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/locations/${locationId}`);
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
        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.location_id}>
                  <td>{row.location_name}</td>
                  <td>{row.type}</td>
                  <td>{row.capacity}</td>
                  <td>{row.current_occupancy}</td>
                  <td><button className="danger-btn" onClick={() => deleteLocation(row.location_id)}>Delete</button></td>
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

      <section className="panel">
        <h2>Update location</h2>
        <form className="form-grid" onSubmit={update}>
          <label>Location ID<input type="number" value={updateForm.location_id} onChange={(e) => setUpdateForm({ ...updateForm, location_id: e.target.value })} required /></label>
          <label>Name<input value={updateForm.location_name} onChange={(e) => setUpdateForm({ ...updateForm, location_name: e.target.value })} /></label>
          <label>Type<select value={updateForm.type} onChange={(e) => setUpdateForm({ ...updateForm, type: e.target.value })}><option value="">(no change)</option><option>Cell</option><option>Workshop</option><option>Dining</option><option>Yard</option><option>Hospital</option></select></label>
          <label>Capacity<input type="number" value={updateForm.capacity} onChange={(e) => setUpdateForm({ ...updateForm, capacity: e.target.value })} /></label>
          <label>Security<input value={updateForm.security_level} onChange={(e) => setUpdateForm({ ...updateForm, security_level: e.target.value })} /></label>
          <label>Active<select value={updateForm.is_active} onChange={(e) => setUpdateForm({ ...updateForm, is_active: e.target.value })}><option value="">(no change)</option><option value="true">true</option><option value="false">false</option></select></label>
          <button className="primary-btn" type="submit">Update</button>
        </form>
      </section>
    </div>
  );
}
