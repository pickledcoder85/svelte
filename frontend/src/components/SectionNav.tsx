import type { AppSection } from '../types';

const sections: Array<{ key: AppSection; title: string; detail: string }> = [
  { key: 'dashboard', title: 'Dashboard', detail: 'Weekly metrics' },
  { key: 'meals', title: 'Meals', detail: 'Compose + scale' },
  { key: 'recipes', title: 'Recipes', detail: 'Favorites + imports' },
  { key: 'foods', title: 'Foods', detail: 'Search + detail' }
];

interface SectionNavProps {
  value: AppSection;
  onChange: (section: AppSection) => void;
}

export function SectionNav({ value, onChange }: SectionNavProps) {
  return (
    <nav className="section-nav" aria-label="Primary">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={value === section.key ? 'section-nav-item is-active' : 'section-nav-item'}
          aria-pressed={value === section.key}
          onClick={() => onChange(section.key)}
        >
          <strong>{section.title}</strong>
          <span>{section.detail}</span>
        </button>
      ))}
    </nav>
  );
}
