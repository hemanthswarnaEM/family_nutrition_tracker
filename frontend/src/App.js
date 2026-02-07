// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, NavLink } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LogMealPage from './pages/LogMealPage';
import RecipesPage from './pages/RecipesPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('currentUser');
    if (u) {
      setUser(JSON.parse(u));
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setUser(null);
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="container nav-content">
            <div className="nav-logo">Family Nutrition</div>
            <div className="nav-links">
              {user ? (
                <>
                  <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
                  <NavLink to="/log" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Log Meal</NavLink>
                  <NavLink to="/recipes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Recipes</NavLink>
                  {user.role === 'admin' && (
                    <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Admin</NavLink>
                  )}
                  <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link to="/profile" style={{ fontWeight: 'bold', color: '#1f2937', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{user.name}</span>
                      <span style={{ fontSize: '18px' }}>👤</span>
                    </Link>
                    <button onClick={handleLogout} className="btn-small">Logout</button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Login</Link>
                  <Link to="/register" className="nav-link">Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <RegisterPage onLogin={setUser} /> : <Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
            <Route path="/log" element={user ? <LogMealPage /> : <Navigate to="/login" />} />
            <Route path="/recipes" element={user ? <RecipesPage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/admin" element={user && user.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />} />

            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
