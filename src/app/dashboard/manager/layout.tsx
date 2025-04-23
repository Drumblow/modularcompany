'use client';

import { RouteGuard } from '@/components/auth/RouteGuard';
import { UserRole } from '@/lib/utils';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={[UserRole.MANAGER, UserRole.ADMIN, UserRole.DEVELOPER]}>
      {children}
    </RouteGuard>
  );
} 