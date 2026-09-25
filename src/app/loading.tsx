export default function Loading() {
  return (
    <div
      className="loading-page"
      role="status"
      aria-label="Loading / ലോഡ് ചെയ്യുന്നു"
    >
      <div className="skeleton wide" />
      <div className="skeleton hero" />
      <div className="skeleton-grid">
        {[1, 2, 3].map((x) => (
          <div key={x} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
