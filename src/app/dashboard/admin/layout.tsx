'use client';

import { RouteGuard } from '@/components/auth/RouteGuard';
import { UserRole } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={[UserRole.ADMIN, UserRole.DEVELOPER]}>
      {children}
    </RouteGuard>
  );
} 