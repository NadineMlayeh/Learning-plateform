import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

const REVENUE_TABLE_PAGE_SIZE = 8;

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

export default function AdminRevenuePage({ pushToast, embedded = false }) {
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
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueSort, setRevenueSort] = useState('highest');
  const [revenuePage, setRevenuePage] = useState(1);

  const filteredRevenueRows = useMemo(() => {
    const query = revenueSearch.trim().toLowerCase();
    const rows = (data.revenuePerFormation || []).filter((entry) =>
      (entry.title || '').toLowerCase().includes(query),
    );

    rows.sort((a, b) => {
      const diff = Number(b.revenue || 0) - Number(a.revenue || 0);
      if (revenueSort === 'least') return -diff;
      return diff;
    });

    return rows;
  }, [data.revenuePerFormation, revenueSearch, revenueSort]);

  const revenueTotalPages = Math.max(
    1,
    Math.ceil(filteredRevenueRows.length / REVENUE_TABLE_PAGE_SIZE),
  );
  const revenuePageRows = filteredRevenueRows.slice(
    (revenuePage - 1) * REVENUE_TABLE_PAGE_SIZE,
    revenuePage * REVENUE_TABLE_PAGE_SIZE,
  );

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

  useEffect(() => {
    setRevenuePage(1);
  }, [revenueSearch, revenueSort, year]);

  useEffect(() => {
    if (revenuePage > revenueTotalPages) {
      setRevenuePage(revenueTotalPages);
    }
  }, [revenuePage, revenueTotalPages]);

  return (
    <section className={embedded ? 'stack admin-skin-page admin-embedded-content' : 'stack admin-skin-page'}>
      {!embedded && <ProfileSidebar user={user} />}

      {!embedded && (
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
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
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
          <div className="table-toolbar">
            <input
              type="text"
              value={revenueSearch}
              onChange={(event) => setRevenueSearch(event.target.value)}
              placeholder="Search by formation name"
            />
            <select
              value={revenueSort}
              onChange={(event) => setRevenueSort(event.target.value)}
            >
              <option value="highest">Highest Revenue</option>
              <option value="least">Least Revenue</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Formation</th>
                  <th>Formateur</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenuePageRows.map((entry) => (
                  <tr key={entry.formationId}>
                    <td>{entry.title}</td>
                    <td>{entry.formateurName || '-'}</td>
                    <td>{money(entry.revenue)}</td>
                  </tr>
                ))}
                {revenuePageRows.length === 0 && (
                  <tr>
                    <td colSpan={3}>No revenue rows for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button
              type="button"
              className="action-btn action-page"
              onClick={() => setRevenuePage((prev) => Math.max(1, prev - 1))}
              disabled={revenuePage === 1}
            >
              Prev
            </button>
            <span>
              Page {revenuePage} / {revenueTotalPages}
            </span>
            <button
              type="button"
              className="action-btn action-page"
              onClick={() =>
                setRevenuePage((prev) => Math.min(revenueTotalPages, prev + 1))
              }
              disabled={revenuePage === revenueTotalPages}
            >
              Next
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
