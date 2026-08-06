import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="page auth-page" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
