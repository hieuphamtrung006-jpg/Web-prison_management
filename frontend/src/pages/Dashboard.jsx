import { usePrisoners } from "../hooks/usePrisoners";

export default function Dashboard() {
  const { data, loading } = usePrisoners();

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-600">
        {loading ? "Loading prisoners..." : `Prisoners loaded: ${data.length}`}
      </p>
    </section>
  );
}

