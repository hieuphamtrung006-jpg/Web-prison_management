import { useEffect, useState } from "react";
import { api } from "../api/client";

const cards = [
  { key: "users", title: "Users", endpoint: "/users?active_only=true" },
  { key: "prisoners", title: "Prisoners", endpoint: "/prisoners" },
  { key: "locations", title: "Locations", endpoint: "/locations" },
  { key: "visits", title: "Pending Visits", endpoint: "/visits?status_filter=Pending&today_only=true" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    const load = async () => {
      const result = {};
      await Promise.all(
        cards.map(async (card) => {
          try {
            const response = await api.get(card.endpoint);
            result[card.key] = Array.isArray(response.data) ? response.data.length : 0;
          } catch {
            result[card.key] = 0;
          }
        })
      );
      setStats(result);
    };
    load();
  }, []);

  return (
    <div>
      <h2>Overview</h2>
      <p className="muted">Realtime counters from backend endpoints.</p>
      <div className="card-grid">
        {cards.map((card) => (
          <article key={card.key} className="stat-card">
            <h3>{card.title}</h3>
            <p>{stats[card.key] ?? "..."}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
