import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: form,
      });
      setMessage('Account created. You can now login.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit} className="grid">
        <input name="name" placeholder="Name" value={form.name} onChange={updateField} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={updateField} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={updateField} required />
        <select name="role" value={form.role} onChange={updateField}>
          <option value="STUDENT">Student</option>
          <option value="FORMATEUR">Formateur</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit">Create account</button>
      </form>
      {message && <p className="ok">{message}</p>}
      {error && <p className="error">{error}</p>}
      <p className="hint">Formateur accounts must be approved by admin before login works.</p>
    </section>
  );
}
