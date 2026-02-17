type RouteStubProps = {
  title: string;
  route: string;
  roles: string[];
  publicSafe: boolean;
  summary: string;
};

export function RouteStub({ title, route, roles, publicSafe, summary }: RouteStubProps) {
  return (
    <main className="route-shell">
      <section className="route-card" aria-label="route stub">
        <h1 className="route-title">{title}</h1>
        <p className="route-meta">route: {route}</p>
        <p className="route-meta">{summary}</p>
        <div className="route-chip-row">
          <span className={`route-chip ${publicSafe ? "safe" : ""}`}>
            {publicSafe ? "public safe" : "session/gated"}
          </span>
          {roles.length === 0 ? <span className="route-chip">no roles</span> : null}
          {roles.map((role) => (
            <span key={role} className="route-chip">
              {role}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
