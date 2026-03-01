import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

function money(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function MonthlyRevenueChart({ rows }) {
  const maxValue = Math.max(1, ...rows.map((entry) => Number(entry.revenue || 0)));

  return (
    <div className="admin-month-chart">
      {rows.map((entry) => {
        const value = Number(entry.revenue || 0);
        const height = Math.max(5, Math.round((value / maxValue) * 100));
        return (
          <article className="admin-month-bar" key={entry.monthLabel}>
            <div className="admin-month-track">
              <div className="admin-month-fill" style={{ height: `${height}%` }} />
            </div>
            <strong>{entry.monthLabel}</strong>
            <span>{money(value)}</span>
          </article>
        );
      })}
    </div>
  );
}

export default function AdminRevenuePage({ pushToast }) {
  const user = getCurrentUser();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    year: currentYear,
    availableYears: [currentYear],
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenuePerFormation: [],
    monthlyRevenue: [],
  });

  async function loadRevenue() {
    setLoading(true);
    try {
      const response = await apiRequest(`/admin/revenue-overview?year=${year}`, {
        token: user.token,
      });
      setData(response);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevenue();
  }, [year]);

  return (
    <section className="stack admin-skin-page">
      <ProfileSidebar user={user} />

      <div className="card panel-head">
        <div>
          <h1>Revenue Overview</h1>
          <p className="hint">All-time revenue, current month revenue, annual monthly trend, and revenue per formation.</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            Back to Admin
          </Link>
          <Link className="link-btn small-btn" to="/admin/students">
            Students
          </Link>
          <Link className="link-btn small-btn" to="/admin/formateurs">
            Formateurs
          </Link>
          <Link className="link-btn small-btn" to="/admin/formations">
            Formations
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Revenue Dashboard</h2>
          <div className="row">
            <StatusBadge label={`Year ${data.year}`} tone="blue" />
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {data.availableYears.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-metric-grid">
          <article className="admin-metric-card">
            <p className="hint">Total Revenue (All Time)</p>
            <strong>{money(data.totalRevenue)}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Revenue This Month</p>
            <strong>{money(data.revenueThisMonth)}</strong>
          </article>
        </div>

        <article className="admin-analytics-card">
          <h3>Monthly Revenue Trend ({data.year})</h3>
          {loading ? <p className="hint">Loading chart...</p> : <MonthlyRevenueChart rows={data.monthlyRevenue} />}
        </article>

        <article className="admin-analytics-card">
          <h3>Revenue Per Formation</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Formation</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data.revenuePerFormation || []).map((entry) => (
                  <tr key={entry.formationId}>
                    <td>{entry.title}</td>
                    <td>{money(entry.revenue)}</td>
                  </tr>
                ))}
                {(!data.revenuePerFormation || data.revenuePerFormation.length === 0) && (
                  <tr>
                    <td colSpan={2}>No revenue rows for this year.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
