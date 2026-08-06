'use client';

import { useEffect, useState } from 'react';

type NotificationItem = {
  id: string;
  type: string;
  actor: { display_name: string; handle: string };
  payload: Record<string, unknown>;
  read: boolean;
};

type NotificationBellProps = {
  label: string;
};

export function NotificationBell({ label }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const response = await fetch('/api/notifications');
    if (response.ok) {
      const data = await response.json();
      setItems(data.items ?? []);
      setUnread(data.unread_count ?? 0);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="notifications">
      <button
        type="button"
        className="btn btn-glass notif-btn"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={label}
      >
        {label}
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel sy-glass">
          {items.length === 0 && <p className="phase-note">—</p>}
          {items.map((item) => (
            <div key={item.id} className={item.read ? 'notif-item' : 'notif-item unread'}>
              <strong>{item.actor.display_name}</strong>
              <span className="notif-type">{item.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
