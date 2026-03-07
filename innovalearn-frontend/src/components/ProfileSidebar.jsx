import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, resolveApiAssetUrl } from '../api';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function formatDateForInput(value) {
  if (!value) return '';
  const dateValue = String(value);
  if (dateValue.includes('T')) return dateValue.slice(0, 10);
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function MetaIcon({ kind }) {
  if (kind === 'bio') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h10" />
      </svg>
    );
  }
  if (kind === 'phone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h5l1.5 4-2.4 1.8a14 14 0 005.6 5.6L17.5 12 21 13.5v5a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z" />
      </svg>
    );
  }
  if (kind === 'email') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18v12H3z" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  }
  if (kind === 'dob') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M8 4v4M16 4v4M4 10h16" />
      </svg>
    );
  }
  if (kind === 'member') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.4 2h3.2l.5 2.2a7.9 7.9 0 011.8.8l2-1.1 2.3 2.3-1.1 2a8.2 8.2 0 01.8 1.8L22 10.4v3.2l-2.2.5a8.2 8.2 0 01-.8 1.8l1.1 2-2.3 2.3-2-1.1a7.9 7.9 0 01-1.8.8l-.5 2.2h-3.2l-.5-2.2a7.9 7.9 0 01-1.8-.8l-2 1.1-2.3-2.3 1.1-2a8.2 8.2 0 01-.8-1.8L2 13.6v-3.2l2.2-.5a8.2 8.2 0 01.8-1.8l-1.1-2L6.2 3.8l2 1.1a7.9 7.9 0 011.8-.8L10.4 2z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export default function ProfileSidebar({ user }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState('bio');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    phoneNumber: '',
    dateOfBirth: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.token || !user?.userId) return;

      try {
        const current = await apiRequest('/users/me', { token: user.token });
        if (!cancelled) setProfile(current);
      } catch {
        try {
          const users = await apiRequest('/users', { token: user.token });
          if (cancelled) return;
          const current = users.find(
            (entry) => Number(entry.id) === Number(user.userId),
          );
          setProfile(
            current || {
              id: user.userId,
              email: '',
              name: '',
            },
          );
        } catch {
          if (!cancelled) {
            setProfile({
              id: user.userId,
              email: '',
              name: '',
            });
          }
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.token, user?.userId]);

  useEffect(() => {
    setForm({
      name: profile?.name || '',
      bio: profile?.bio || '',
      phoneNumber: profile?.phoneNumber || '',
      dateOfBirth: formatDateForInput(profile?.dateOfBirth),
    });
  }, [profile?.name, profile?.bio, profile?.phoneNumber, profile?.dateOfBirth]);

  const canEditProfile = useMemo(() => {
    const role = String(profile?.role || user?.role || '');
    return role === 'STUDENT' || role === 'FORMATEUR';
  }, [profile?.role, user?.role]);

  const displayName = useMemo(() => {
    const name = String(profile?.name || '').trim();
    return name || 'User';
  }, [profile?.name]);

  const avatarUrl = useMemo(() => {
    if (!profile?.profileImageUrl) return '';
    return resolveApiAssetUrl(profile.profileImageUrl);
  }, [profile?.profileImageUrl]);

  const roleLabel = useMemo(() => {
    const role = String(profile?.role || user?.role || 'USER');
    return role.charAt(0) + role.slice(1).toLowerCase();
  }, [profile?.role, user?.role]);

  const roleKey = useMemo(
    () => String(profile?.role || user?.role || '').toUpperCase(),
    [profile?.role, user?.role],
  );

  const showGlassSidebar = roleKey === 'STUDENT' || roleKey === 'FORMATEUR';

  useEffect(() => {
    const shouldShift = isHovered || isEditMode;
    document.body.classList.toggle('profile-glass-expanded', shouldShift);
    document.body.classList.toggle('profile-glass-editing', isEditMode);

    return () => {
      document.body.classList.remove('profile-glass-expanded');
      document.body.classList.remove('profile-glass-editing');
    };
  }, [isHovered, isEditMode]);

  const infoItems = useMemo(
    () => [
      { key: 'bio', label: 'Bio', value: profile?.bio?.trim() || '-', icon: 'bio' },
      { key: 'phone', label: 'Phone', value: profile?.phoneNumber || '-', icon: 'phone' },
      { key: 'email', label: 'Email', value: profile?.email || '-', icon: 'email' },
      { key: 'dob', label: 'Date of Birth', value: formatDate(profile?.dateOfBirth), icon: 'dob' },
      { key: 'member', label: 'Member Since', value: formatDate(profile?.createdAt), icon: 'member' },
    ],
    [profile?.bio, profile?.phoneNumber, profile?.email, profile?.dateOfBirth, profile?.createdAt],
  );

  async function handleAvatarSelection(event) {
    const file = event.target.files?.[0];
    if (!file || !user?.token || !canEditProfile) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAvatar(true);
    setStatusMessage('');

    try {
      const updated = await apiRequest('/users/me/avatar', {
        method: 'PATCH',
        token: user.token,
        body: formData,
      });
      setProfile(updated);
      setStatusMessage('');
    } catch (err) {
      setStatusMessage(err.message || 'Failed to update profile picture.');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!canEditProfile || !user?.token) return;

    setSavingProfile(true);
    setStatusMessage('');

    try {
      const updated = await apiRequest('/users/me', {
        method: 'PATCH',
        token: user.token,
        body: {
          name: form.name,
          bio: form.bio,
          phoneNumber: form.phoneNumber || null,
          dateOfBirth: form.dateOfBirth || null,
        },
      });
      setProfile(updated);
      setStatusMessage('');
      setIsEditMode(false);
      setActiveItem('bio');
    } catch (err) {
      setStatusMessage(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  function openFilePicker() {
    if (!canEditProfile || uploadingAvatar) return;
    fileInputRef.current?.click();
  }

  if (!showGlassSidebar) {
    return null;
  }

  return (
    <aside
      className={`profile-glass-sidebar ${isEditMode ? 'is-editing' : ''}`}
      aria-label="Profile sidebar"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="profile-avatar-input"
        onChange={handleAvatarSelection}
      />

      <div className="profile-glass-content">
        <div className="profile-glass-item profile-glass-avatar-item">
          <div className="profile-avatar-circle profile-avatar-circle-identity">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName} profile`} />
            ) : (
              <span className="profile-avatar-empty" aria-hidden="true" />
            )}
          </div>
          <span className="profile-glass-item-text profile-glass-avatar-text">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
        </div>

        {!isEditMode && (
          <div className="profile-glass-items-list">
            {infoItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`profile-glass-item ${activeItem === item.key ? 'is-active' : ''}`}
                onClick={() => setActiveItem(item.key)}
                title={item.label}
              >
                <span className="profile-glass-icon" aria-hidden="true">
                  <MetaIcon kind={item.icon} />
                </span>
                <span className="profile-glass-item-text">
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {isEditMode && canEditProfile && (
          <form className="profile-glass-edit-panel" onSubmit={saveProfile}>
            <div className="profile-glass-edit-avatar-row">
              <div className="profile-avatar-circle">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={`${displayName} profile`} />
                ) : (
                  <span className="profile-avatar-empty" aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                className="profile-glass-upload-btn"
                onClick={openFilePicker}
                disabled={uploadingAvatar}
                aria-label="Change photo"
              >
                <img src="/images/import.png" alt="" className="profile-glass-upload-icon" />
                <span className="profile-glass-upload-text">
                  {uploadingAvatar ? 'uploading...' : 'change photo'}
                </span>
              </button>
            </div>

            <label className="profile-edit-field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </label>

            <label className="profile-edit-field">
              <span>Bio</span>
              <textarea
                rows={3}
                maxLength={220}
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
              />
            </label>

            <label className="profile-edit-field">
              <span>Phone number</span>
              <div className="profile-edit-input-wrap">
                <span className="profile-edit-input-icon" aria-hidden="true">
                  <MetaIcon kind="phone" />
                </span>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </label>

            <label className="profile-edit-field">
              <span>Date of birth</span>
              <div className="profile-edit-input-wrap">
                <span className="profile-edit-input-icon" aria-hidden="true">
                  <MetaIcon kind="dob" />
                </span>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dateOfBirth: event.target.value,
                    }))
                  }
                />
              </div>
            </label>

            <div className="profile-glass-edit-actions">
              <button
                type="submit"
                className="profile-save-btn"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="profile-glass-cancel-btn"
                onClick={() => {
                  if (savingProfile) return;
                  setIsEditMode(false);
                  setStatusMessage('');
                }}
                disabled={savingProfile}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {canEditProfile && !isEditMode && (
        <div className="profile-glass-bottom">
          <button
            type="button"
            className={`profile-glass-item profile-glass-settings ${
              activeItem === 'settings' ? 'is-active' : ''
            }`}
            onClick={() => {
              setActiveItem('settings');
              setIsEditMode(true);
              setStatusMessage('');
            }}
            title="Settings"
          >
            <span className="profile-glass-icon" aria-hidden="true">
              <MetaIcon kind="settings" />
            </span>
            <span className="profile-glass-item-text">
              <strong>Settings</strong>
              <small>Edit profile</small>
            </span>
          </button>
        </div>
      )}

      {statusMessage && <p className="hint profile-glass-note">{statusMessage}</p>}
    </aside>
  );
}
