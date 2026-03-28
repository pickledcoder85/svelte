import type { AppSection } from '../types';

const sections: Array<{ key: AppSection; label: string; detail: string }> = [
  { key: 'dashboard', label: 'Dashboard', detail: 'Weekly health' },
  { key: 'meals', label: 'Meals', detail: 'Compose foods' },
  { key: 'recipes', label: 'Recipes', detail: 'Favorites + imports' }
];

interface SegmentedNavProps {
  value: AppSection;
  onChange: (section: AppSection) => void;
}

export function SegmentedNav({ value, onChange }: SegmentedNavProps) {
  return (
    <div className="segmented-nav" role="tablist" aria-label="Primary app sections">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={value === section.key ? 'segment is-active' : 'segment'}
          role="tab"
          aria-selected={value === section.key}
          onClick={() => onChange(section.key)}
        >
          <strong>{section.label}</strong>
          <span>{section.detail}</span>
        </button>
      ))}
    </div>
  );
}
