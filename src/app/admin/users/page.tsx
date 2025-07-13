// src/app/admin/users/page.tsx
import { getAllUsers } from '@/actions/adminActions';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { PageHeader } from '@/components/ui/page-header';
import { Users } from 'lucide-react';

export default async function AdminUsersPage() {
  const initialUsers = await getAllUsers();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Create, view, and manage user accounts and roles."
        className="text-left py-0"
      />
      <UserManagementTable initialUsers={initialUsers} />
    </div>
  );
}
