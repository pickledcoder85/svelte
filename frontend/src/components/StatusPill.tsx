interface StatusPillProps {
  tone: 'checking' | 'live' | 'demo' | 'warning';
  label: string;
}

export function StatusPill({ tone, label }: StatusPillProps) {
  return <span className={`status-pill status-${tone}`}>{label}</span>;
}
