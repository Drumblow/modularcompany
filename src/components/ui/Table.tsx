import React from 'react';
import { cn } from '@/lib/utils';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  className?: string;
  children: React.ReactNode;
}

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  className?: string;
  children: React.ReactNode;
}

// Componente para visualização em lista para dispositivos móveis
interface MobileTableCardProps {
  headers: React.ReactNode[];
  rowData: React.ReactNode[];
  className?: string;
}

export function MobileTableCard({ headers, rowData, className }: MobileTableCardProps) {
  return (
    <div className={cn("border rounded-md p-3 mb-3 bg-card", className)}>
      {headers.map((header, index) => (
        <div key={index} className="flex justify-between py-1 border-b last:border-0">
          <div className="font-medium text-sm text-muted-foreground">{header}</div>
          <div className="text-sm text-right">{rowData[index]}</div>
        </div>
      ))}
    </div>
  );
}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead className={cn('[&_tr]:border-b', className)} {...props} />
  );
}

export function TableBody({ className, ...props }: TableBodyProps) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: TableFooterProps) {
  return (
    <tfoot
      className={cn('bg-primary font-medium text-primary-foreground', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TableCellProps) {
  return (
    <td
      className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: TableCaptionProps) {
  return (
    <caption
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
} 