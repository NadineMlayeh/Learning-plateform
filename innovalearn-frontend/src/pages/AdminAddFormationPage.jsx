import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminAddFormationPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailName, setThumbnailName] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    type: 'ONLINE',
    location: '',
    startDate: '',
    endDate: '',
    profileImageUrl: '',
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === 'type') {
        return {
          ...prev,
          type: value,
          startDate: value === 'PRESENTIEL' ? prev.startDate : '',
          endDate: value === 'PRESENTIEL' ? prev.endDate : '',
        };
      }

      return { ...prev, [name]: value };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        type: form.type,
      };

      if (form.profileImageUrl) payload.profileImageUrl = form.profileImageUrl;
      if (form.location) payload.location = form.location;
      if (form.type === 'PRESENTIEL') {
        if (form.startDate) payload.startDate = form.startDate;
        if (form.endDate) payload.endDate = form.endDate;
      }

      const created = await apiRequest('/formations', {
        method: 'POST',
        token: user.token,
        body: payload,
      });

      pushToast('Formation created.', 'success');
      navigate(`/formateur/formations/${created.id}`);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleThumbnailChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiRequest('/formations/thumbnail', {
        method: 'POST',
        token: user.token,
        body: formData,
      });
      const url = data?.url || '';
      setForm((prev) => ({ ...prev, profileImageUrl: url }));
      setThumbnailName(file.name || 'thumbnail');
      pushToast('Thumbnail uploaded.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setThumbnailUploading(false);
      event.target.value = '';
    }
  }

  return (
    <section className="card">
      <h1>Add Formation</h1>
      <form className="grid" onSubmit={handleSubmit}>
        <input
          id="add-formation-thumb"
          className="formation-thumb-input"
          type="file"
          accept="image/*"
          onChange={handleThumbnailChange}
          disabled={isSubmitting || thumbnailUploading}
        />
        <label htmlFor="add-formation-thumb" className="formation-thumb-link">
          <img src="/images/gallery.png" alt="" />
          <span>
            {thumbnailUploading
              ? 'Uploading thumbnail...'
              : form.profileImageUrl
              ? 'Change Thumbnail Photo'
              : 'Add Thumbnail Photo'}
          </span>
        </label>
        {thumbnailName ? (
          <p className="hint formation-thumb-name">{thumbnailName}</p>
        ) : null}
        <input name="title" value={form.title} onChange={updateField} placeholder="Title" required />
        <textarea name="description" value={form.description} onChange={updateField} placeholder="Description" required />
        <input name="price" type="number" min="0" value={form.price} onChange={updateField} placeholder="Price" required />
        <select name="type" value={form.type} onChange={updateField}>
          <option value="ONLINE">ONLINE</option>
          <option value="PRESENTIEL">PRESENTIEL</option>
        </select>
        {form.type === 'PRESENTIEL' && (
          <>
            <input name="location" value={form.location} onChange={updateField} placeholder="Location (optional)" />
            <input name="startDate" type="date" value={form.startDate} onChange={updateField} />
            <input name="endDate" type="date" value={form.endDate} onChange={updateField} />
          </>
        )}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Formation'}</button>
      </form>
    </section>
  );
}
