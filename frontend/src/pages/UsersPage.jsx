import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

const initialForm = {
  username: "",
  full_name: "",
  role: "Guard",
  email: "",
  phone: "",
  password: "",
};

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [updateForm, setUpdateForm] = useState({
    user_id: "",
    full_name: "",
    role: "",
    email: "",
    phone: "",
    password: "",
    is_active: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/users?active_only=true&page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/users", form);
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const updateUser = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.user_id) {
      setError("User ID is required");
      return;
    }

    const payload = {};
    if (updateForm.full_name) payload.full_name = updateForm.full_name;
    if (updateForm.role) payload.role = updateForm.role;
    if (updateForm.email) payload.email = updateForm.email;
    if (updateForm.phone) payload.phone = updateForm.phone;
    if (updateForm.password) payload.password = updateForm.password;
    if (updateForm.is_active !== "") payload.is_active = updateForm.is_active === "true";

    try {
      await api.put(`/users/${Number(updateForm.user_id)}`, payload);
      setUpdateForm({
        user_id: "",
        full_name: "",
        role: "",
        email: "",
        phone: "",
        password: "",
        is_active: "",
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deleteUser = async (userId) => {
    const confirmed = window.confirm("Delete this user permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/users/${userId}`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>Users</h2>
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
                <th>ID</th>
                <th>Username</th>
                <th>Full name</th>
                <th>Role</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.user_id}</td>
                  <td>{row.username}</td>
                  <td>{row.full_name}</td>
                  <td>{row.role}</td>
                  <td>{row.email || "-"}</td>
                  <td><button className="danger-btn" onClick={() => deleteUser(row.user_id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Create user</h2>
        <form className="form-grid" onSubmit={createUser}>
          <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
          <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option><option>Warden</option><option>Guard</option><option>Viewer</option>
            </select>
          </label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <button className="primary-btn" type="submit">Create</button>
        </form>
      </section>

      <section className="panel">
        <h2>Update user</h2>
        <form className="form-grid" onSubmit={updateUser}>
          <label>User ID<input type="number" value={updateForm.user_id} onChange={(e) => setUpdateForm({ ...updateForm, user_id: e.target.value })} required /></label>
          <label>Full name<input value={updateForm.full_name} onChange={(e) => setUpdateForm({ ...updateForm, full_name: e.target.value })} /></label>
          <label>Role
            <select value={updateForm.role} onChange={(e) => setUpdateForm({ ...updateForm, role: e.target.value })}>
              <option value="">(no change)</option>
              <option>Admin</option><option>Warden</option><option>Guard</option><option>Viewer</option>
            </select>
          </label>
          <label>Email<input value={updateForm.email} onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })} /></label>
          <label>Phone<input value={updateForm.phone} onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })} /></label>
          <label>Password<input type="password" value={updateForm.password} onChange={(e) => setUpdateForm({ ...updateForm, password: e.target.value })} /></label>
          <label>Active
            <select value={updateForm.is_active} onChange={(e) => setUpdateForm({ ...updateForm, is_active: e.target.value })}>
              <option value="">(no change)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <button className="primary-btn" type="submit">Update</button>
        </form>
      </section>
    </div>
  );
}
