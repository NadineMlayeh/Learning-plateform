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

export default function ProfileSidebar({ user }) {
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
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
      dateOfBirth: formatDateForInput(profile?.dateOfBirth),
    });
  }, [profile?.name, profile?.bio, profile?.dateOfBirth]);

  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setStatusMessage('');
    }
  }, [open]);

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
      setStatusMessage('Profile picture updated.');
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
          dateOfBirth: form.dateOfBirth || null,
        },
      });
      setProfile(updated);
      setStatusMessage('Profile updated successfully.');
      setIsEditMode(false);
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

  function handleUploadLinkClick(event) {
    event.preventDefault();
    openFilePicker();
  }

  return (
    <>
      <button
        type="button"
        className="profile-drawer-toggle"
        onClick={() => setOpen(true)}
      >
        <span>My Profile</span>
        <span className="profile-toggle-chevron" aria-hidden="true" />
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
            {'\u2715'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="profile-avatar-input"
          onChange={handleAvatarSelection}
        />

        {!isEditMode && (
          <>
            <div className="profile-identity-row">
              <div className="profile-identity-avatar">
                <div className="profile-avatar-circle profile-avatar-circle-identity">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={`${displayName} profile`} />
                  ) : (
                    <span className="profile-avatar-empty" aria-hidden="true" />
                  )}
                </div>
              </div>

              <div className="profile-identity-info">
                <h3>{displayName}</h3>
              </div>
            </div>
            <div className="profile-card">
              <p className="hint">Bio</p>
              <strong>{profile?.bio?.trim() || ''}</strong>
            </div>
            <div className="profile-card">
              <p className="hint">Email</p>
              <strong>{profile?.email || 'Not available'}</strong>
            </div>
            <div className="profile-card">
              <p className="hint">Date of birth</p>
              <strong>{formatDate(profile?.dateOfBirth)}</strong>
            </div>

            <div className="profile-card">
              <p className="hint">Member since</p>
              <strong>{formatDate(profile?.createdAt)}</strong>
            </div>

            {canEditProfile && (
              <a
                href="#"
                className="profile-settings-link"
                onClick={(event) => {
                  event.preventDefault();
                  setIsEditMode(true);
                }}
              >
                <img src="/images/settings.png" alt="" className="profile-settings-icon" />
                <span>Settings</span>
              </a>
            )}
          </>
        )}

        {isEditMode && canEditProfile && (
          <form className="profile-settings-panel" onSubmit={saveProfile}>
            <div className="profile-settings-avatar-row">
              <div className="profile-avatar-circle">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={`${displayName} profile`} />
                ) : (
                  <span className="profile-avatar-empty" aria-hidden="true" />
                )}
              </div>
              <a
                href="#"
                className="profile-upload-link"
                onClick={handleUploadLinkClick}
                aria-disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload photo'}
              </a>
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
                rows={4}
                maxLength={220}
                placeholder="Write a short phrase representing you..."
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
              />
            </label>

            <label className="profile-edit-field">
              <span>Date of birth</span>
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
            </label>

            <div className="profile-settings-actions">
              <button
                type="submit"
                className="profile-save-btn"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>

              <a
                href="#"
                className="profile-cancel-link"
                onClick={(event) => {
                  event.preventDefault();
                  if (savingProfile) return;
                  setIsEditMode(false);
                }}
                aria-disabled={savingProfile}
              >
                Cancel
              </a>
            </div>
          </form>
        )}

        {statusMessage && <p className="hint profile-avatar-note">{statusMessage}</p>}
      </aside>
    </>
  );
}
