import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import AdminLoginForm from '@/components/admin/admin-login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect('/admin');
  }

  return <AdminLoginForm />;
}
