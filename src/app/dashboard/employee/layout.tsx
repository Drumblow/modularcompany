'use client';

import { RouteGuard } from '@/components/auth/RouteGuard';
import { UserRole } from '@/lib/utils';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={[UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.DEVELOPER]}>
      {children}
    </RouteGuard>
  );
} 