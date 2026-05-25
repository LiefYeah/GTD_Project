export function TomatoPips({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;

  if (total > 8) {
    return (
      <div className="tomato-track">
        <span style={{ fontSize: 12 }}>🍅</span>
        <span className="tomato-count">× {done}/{total}</span>
      </div>
    );
  }

  return (
    <div className="tomato-track">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`tomato-pip ${i < done ? 'is-done' : ''}`} />
      ))}
      <span className="tomato-count">{done}/{total}</span>
    </div>
  );
}
