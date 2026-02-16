import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';

function formatRole(role) {
  if (!role) return 'User';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function ProfileSidebar({ user }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.token || !user?.userId) return;

      try {
        const users = await apiRequest('/users', { token: user.token });
        if (cancelled) return;

        const current = users.find(
          (entry) => Number(entry.id) === Number(user.userId),
        );

        setProfile(
          current || {
            id: user.userId,
            role: user.role,
          },
        );
      } catch (err) {
        if (!cancelled) {
          setProfile({
            id: user.userId,
            role: user.role,
          });
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.token, user?.userId, user?.role]);

  const displayName = useMemo(() => {
    if (profile?.name) return profile.name;
    return `User #${user?.userId || '-'}`;
  }, [profile?.name, user?.userId]);

  return (
    <>
      <button
        type="button"
        className="profile-drawer-toggle"
        onClick={() => setOpen(true)}
      >
        My Profile
      </button>

      {open && (
        <button
          type="button"
          className="profile-drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close profile sidebar"
        />
      )}

      <aside className={`profile-drawer ${open ? 'is-open' : ''}`}>
        <div className="profile-drawer-head">
          <h2>Profile</h2>
          <button
            type="button"
            className="profile-drawer-close"
            onClick={() => setOpen(false)}
            aria-label="Close profile sidebar"
          >
            x
          </button>
        </div>

        <div className="profile-card">
          <p className="hint">Name</p>
          <strong>{displayName}</strong>
        </div>

        <div className="profile-card">
          <p className="hint">Role</p>
          <strong>{formatRole(profile?.role || user?.role)}</strong>
        </div>

        <div className="profile-card">
          <p className="hint">Email</p>
          <strong>{profile?.email || 'Not available'}</strong>
        </div>

        <div className="profile-card">
          <p className="hint">User ID</p>
          <strong>{profile?.id || user?.userId || '-'}</strong>
        </div>
      </aside>
    </>
  );
}
