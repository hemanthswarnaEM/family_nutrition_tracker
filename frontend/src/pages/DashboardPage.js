import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import MacroRing from '../components/MacroRing';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);



function DashboardPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]); // For Admin
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // View State
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'custom'
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // For Day view
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Last 7 days
    end: new Date().toISOString().slice(0, 10)
  });

  // Data State
  const [dailyStats, setDailyStats] = useState(null);
  const [historyStats, setHistoryStats] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [nutrientsList, setNutrientsList] = useState([]); // For detailed table

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setSelectedUserId(user.id);

        // If Admin, fetch all users
        if (user.role === 'admin') {
          fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          })
            .then(r => r.json())
            .then(data => {
              if (Array.isArray(data)) setUsers(data);
            })
            .catch(console.error);
        }

      } catch (e) {
        console.error('Failed to parse currentUser', e);
      }
    }

    // Dynamic Nutrient Fetch
    fetch(`${API_BASE_URL}/nutrients`)
      .then(res => res.json())
      .then(data => {
        // Filter out macros if we only want detailed breakdown to show micros + stats? 
        // Or show all? The UI table shows all.
        // Let's assume we show everything the user tracks.
        setNutrientsList(data);
      })
      .catch(console.error);

    setLoading(false);
  }, []);

  // Fetch Data when View/User/Date changes
  useEffect(() => {
    if (!selectedUserId) return;

    const token = localStorage.getItem('authToken');
    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. Fetch Stats based on View Mode
    if (viewMode === 'day') {
      setLoading(true);
      fetch(`${API_BASE_URL}/analytics/day?user_id=${selectedUserId}&date=${date}&_t=${Date.now()}`, { headers })
        .then(res => res.json())
        .then(data => {
          setDailyStats(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      // Range (Week or Custom)
      setLoading(true);
      let start = dateRange.start;
      let end = dateRange.end;

      fetch(`${API_BASE_URL}/analytics/history?user_id=${selectedUserId}&start_date=${start}&end_date=${end}&_t=${Date.now()}`, { headers })
        .then(res => res.json())
        .then(data => {
          setHistoryStats(data); // Array of daily summaries
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }

  }, [selectedUserId, viewMode, date, dateRange]);

  const handleWeekSet = () => {
    const e = new Date();
    const s = new Date(e);
    s.setDate(e.getDate() - 6);
    const newRange = {
      start: s.toISOString().slice(0, 10),
      end: e.toISOString().slice(0, 10)
    };
    setDateRange(newRange);
    setViewMode('week');
  };

  const getDayNutrient = (code) => {
    if (!dailyStats || !dailyStats.nutrients) return null;
    return dailyStats.nutrients.find((n) => n.code === code);
  };

  // --- Render Helpers ---

  const renderDayView = () => {
    if (loading) return <div>Loading Stats...</div>;
    if (!dailyStats) return <div>No data available</div>;

    const calories = getDayNutrient('energy_kcal');
    const protein = getDayNutrient('protein');
    const carbs = getDayNutrient('carbohydrates');
    const fat = getDayNutrient('fat_total');

    return (
      <>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Summary for {new Date(date).toLocaleDateString()}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <MacroRing
              label="Calories"
              current={calories ? calories.total_amount : 0}
              target={calories ? (calories.custom_target || calories.rda_target) : 2000}
              unit="kcal"
              color="#3b82f6" // Blue
            />
            <MacroRing
              label="Protein"
              current={protein ? protein.total_amount : 0}
              target={protein ? (protein.custom_target || protein.rda_target) : 150}
              unit="g"
              color="#10b981" // Green
            />
            <MacroRing
              label="Carbs"
              current={carbs ? carbs.total_amount : 0}
              target={carbs ? (carbs.custom_target || carbs.rda_target) : 250}
              unit="g"
              color="#f59e0b" // Orange
            />
            <MacroRing
              label="Fat"
              current={fat ? fat.total_amount : 0}
              target={fat ? (fat.custom_target || fat.rda_target) : 70}
              unit="g"
              color="#ef4444" // Red
            />
          </div>
        </div>

        <div className="card">
          <h3>Detailed Nutrient Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: '8px' }}>Nutrient</th>
                  <th style={{ padding: '8px' }}>Total</th>
                  <th style={{ padding: '8px' }}>Target</th>
                  <th style={{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {nutrientsList.map(item => {
                  const n = getDayNutrient(item.code);
                  const amount = n ? n.total_amount : 0;
                  const target = n ? (n.custom_target || n.rda_target) : 0;
                  const pct = target ? Math.round((amount / target) * 100) : 0;
                  const color = pct > 100 && item.code === 'energy_kcal' ? 'red' : pct >= 100 ? 'green' : 'orange';

                  return (
                    <tr key={item.code} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{item.name}</td>
                      <td style={{ padding: '8px' }}>{Math.round(amount)} {item.unit}</td>
                      <td style={{ padding: '8px' }}>{target ? target + ' ' + item.unit : '-'}</td>
                      <td style={{ padding: '8px', color: color, fontWeight: 'bold' }}>{target ? `${pct}%` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderHistoryChart = () => {
    if (loading) return <div>Loading Chart...</div>;
    if (!historyStats || historyStats.length === 0) return <div>No history data for this range.</div>;

    const labels = historyStats.map(d => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const data = {
      labels,
      datasets: [
        {
          label: 'Calories',
          data: historyStats.map(d => Math.round(d.energy_kcal || 0)),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgb(53, 162, 235)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Protein (g)',
          data: historyStats.map(d => Math.round(d.protein || 0)),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
        {
          label: 'Carbs (g)',
          data: historyStats.map(d => Math.round(d.carbohydrates || 0)),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
        {
          label: 'Fat (g)',
          data: historyStats.map(d => Math.round(d.fat_total || 0)),
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };

    const options = {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Calories' } },
        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Grams' } },
      }
    };

    return (
      <div className="card" style={{ height: '400px' }}>
        <Bar options={options} data={data} />
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Welcome to Family Nutrition Tracker</h2>
        <p>Please <Link to="/login">Login</Link> to continue.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        {currentUser.role === 'admin' && (
          <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {/* Show All Users (and ensure Current Admin is in list if not fetched yet) */}
              {[...users].map(u => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  style={{
                    minWidth: '100px',
                    padding: '10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: selectedUserId == u.id ? 'var(--primary)' : 'white',
                    color: selectedUserId == u.id ? 'white' : 'var(--text-color)',
                    border: selectedUserId == u.id ? 'none' : '1px solid #e5e7eb',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '5px' }}>
                    {u.sex === 'male' ? '👨' : u.sex === 'female' ? '👩' : '🧑'}
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.name.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
              Browsing as <strong>{users.find(u => u.id == selectedUserId)?.name || 'User'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 1. TOP ACTIONS */}
      <div className="dashboard-actions">
        <Link to="/log" className="action-card">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
          <h3 style={{ marginBottom: '4px', color: 'var(--primary)' }}>Log Meal</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Record what you ate</p>
        </Link>
        <Link to="/recipes" className="action-card">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍲</div>
          <h3 style={{ marginBottom: '4px', color: 'var(--success)' }}>Recipes</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage family favorites</p>
        </Link>
      </div>


      {/* 3. CONTROLS & STATS */}
      <div className="date-controls">
        <div className="view-toggle-container">
          <button
            className={`view-toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Day
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={handleWeekSet}
          >
            Week
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'custom' ? 'active' : ''}`}
            onClick={() => setViewMode('custom')}
          >
            Custom
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {viewMode === 'day' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              style={{ margin: 0, width: 'auto' }}
            />
          )}
          {(viewMode === 'week' || viewMode === 'custom') && (
            <>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setViewMode('custom');
                }}
                className="input" style={{ margin: 0, width: 'auto' }}
              />
              <span style={{ color: '#6b7280' }}>-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setViewMode('custom');
                }}
                className="input" style={{ margin: 0, width: 'auto' }}
              />
            </>
          )}
        </div>
      </div>

      {viewMode === 'day' ? renderDayView() : renderHistoryChart()}

    </div>
  );
}

function SummaryItem({ label, data }) {
  if (!data) return (
    <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <div style={{ fontWeight: '500', marginBottom: '5px' }}>{label}</div>
      <div style={{ color: '#9ca3af', fontSize: '13px' }}>No data</div>
    </div>
  );

  const percent = data.rda_target ? Math.min(100, (data.total_amount / data.rda_target) * 100) : 0;
  const color = percent > 100 ? '#ef4444' : '#10b981';

  return (
    <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
        {Math.round(data.total_amount)} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>{data.unit}</span>
      </div>
      {data.rda_target && (
        <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px' }}>
          <div style={{ width: `${percent}%`, backgroundColor: color, height: '100%', borderRadius: '3px' }}></div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
