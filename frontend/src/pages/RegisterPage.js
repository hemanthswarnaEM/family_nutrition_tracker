// frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

function RegisterPage({ onLogin }) {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            // Auto login after register? Or just redirect to login?
            // Let's redirect to login for simplicity or auto-login if backend returned token (it returned user)
            // Backend registers but doesn't return token immediately in the code I wrote (check index.js)
            // Wait, index.js register returns user details but NOT token. 
            // So tell user to login.
            alert('Registration successful! Please login.');
            navigate('/login');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Register</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem' }}>Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem' }}>Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem' }}>Password</label>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
        </div>
    );
}

export default RegisterPage;
