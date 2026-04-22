import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

export default function SchedulesPage() {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(1);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [daily, setDaily] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const loadConfigs = async () => {
    try {
      const response = await api.get("/schedules/configs");
      setConfigs(response.data);
      if (response.data.length > 0) {
        setSelectedConfig(response.data[0].config_id);
      }
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const loadDaily = async () => {
    try {
      const response = await api.get(`/schedules/daily?target_date=${targetDate}&group_by=location`);
      setDaily(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const generate = async () => {
    setError("");
    try {
      const response = await api.post("/schedules/generate", {
        config_id: Number(selectedConfig),
        target_date: targetDate,
      });
      setResult(response.data);
      await loadDaily();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="stack-grid">
      <section className="panel">
        <h2>Schedule Generator (GA)</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <label>Config
            <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)}>
              {configs.map((cfg) => (
                <option key={cfg.config_id} value={cfg.config_id}>{cfg.config_name || `Config ${cfg.config_id}`}</option>
              ))}
            </select>
          </label>
          <label>Target date<input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></label>
          <button className="primary-btn" onClick={generate}>Generate</button>
          <button className="secondary-btn" onClick={loadDaily}>Refresh Daily</button>
        </div>
        {result && (
          <pre className="json-box">{JSON.stringify(result, null, 2)}</pre>
        )}
      </section>

      <section className="panel">
        <h2>Daily Grouped Schedule</h2>
        {daily ? <pre className="json-box">{JSON.stringify(daily, null, 2)}</pre> : <p className="muted">No data loaded</p>}
      </section>
    </div>
  );
}
