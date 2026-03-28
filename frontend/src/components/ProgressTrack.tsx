interface ProgressTrackProps {
  label: string;
  consumed: number;
  target: number;
  accent: string;
}

export function ProgressTrack({ label, consumed, target, accent }: ProgressTrackProps) {
  const percentage = target <= 0 ? 0 : Math.min((consumed / target) * 100, 100);

  return (
    <div className="progress-track">
      <div className="progress-track-header">
        <strong>{label}</strong>
        <span>
          {consumed}g / {target}g
        </span>
      </div>
      <div className="progress-track-bar" aria-hidden="true">
        <div className="progress-track-fill" style={{ width: `${percentage}%`, background: accent }} />
      </div>
    </div>
  );
}
