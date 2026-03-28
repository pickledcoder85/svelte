import type { PropsWithChildren, ReactNode } from 'react';

interface SurfaceProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function Surface({ title, eyebrow, action, className, children }: PropsWithChildren<SurfaceProps>) {
  return (
    <section className={`surface ${className ?? ''}`.trim()}>
      {(title || eyebrow || action) && (
        <div className="surface-header">
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
