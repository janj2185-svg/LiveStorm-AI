'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-glass" onClick={logout}>
      {label}
    </button>
  );
}
