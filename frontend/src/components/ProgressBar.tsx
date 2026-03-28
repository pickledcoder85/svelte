interface ProgressBarProps {
  label: string;
  value: number;
  target: number;
  accent: string;
}

export function ProgressBar({ label, value, target, accent }: ProgressBarProps) {
  const progress = target <= 0 ? 0 : Math.min((value / target) * 100, 100);

  return (
    <div className="macro-row">
      <div className="macro-label">
        <strong>{label}</strong>
        <span>
          {value}g / {target}g
        </span>
      </div>
      <div className="macro-track" aria-hidden="true">
        <div className="macro-fill" style={{ width: `${progress}%`, background: accent }} />
      </div>
    </div>
  );
}
