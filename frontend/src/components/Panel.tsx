import type { PropsWithChildren, ReactNode } from 'react';

interface PanelProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, action, className, children }: PropsWithChildren<PanelProps>) {
  return (
    <section className={`panel ${className ?? ''}`.trim()}>
      {(title || eyebrow || action) && (
        <div className="section-heading">
          <div>
            {eyebrow ? <p>{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
