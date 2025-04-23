import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col space-y-2">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {actions && <div className="flex items-center gap-2 mt-4">{actions}</div>}
    </div>
  );
} 