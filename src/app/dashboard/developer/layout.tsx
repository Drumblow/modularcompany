'use client';

import { RouteGuard } from '@/components/auth/RouteGuard';
import { UserRole } from '@/lib/utils';

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={[UserRole.DEVELOPER]}>
      {children}
    </RouteGuard>
  );
} 