export default function Layout({ children }) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

