import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';

export default async function HomeDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  redirect(`/${locale}/feed`);
}
