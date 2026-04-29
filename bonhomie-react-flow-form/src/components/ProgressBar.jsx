export default function ProgressBar({ current, total }) {
  const pct = ((current + 1) / total) * 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          height: 6,
          background: '#e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: '#3b82f6',
            transition: 'width 0.3s',
          }}
        />
      </div>
      <p style={{ fontSize: 12, marginTop: 6 }}>
        Step {current + 1} of {total}
      </p>
    </div>
  );
}
