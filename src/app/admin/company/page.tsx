import { redirect } from 'next/navigation';

export default function CompanyIndexPage() {
  // Redirect to dashboard
  redirect('/admin/company/dashboard');
}
