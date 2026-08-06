import { AdminClient } from './AdminClient';

export default function AdminPage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>SYLORA Admin Console</h1>
      <p style={{ color: '#5c6678' }}>Production admin panel — requires admin or moderator role.</p>
      <AdminClient />
    </main>
  );
}
