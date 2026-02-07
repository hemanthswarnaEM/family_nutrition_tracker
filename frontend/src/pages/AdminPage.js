import React, { useEffect, useState } from 'react';

import { API_BASE_URL as API_BASE } from '../config';

function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
    const [message, setMessage] = useState(null);

    // Password reset state
    const [resetId, setResetId] = useState(null);
    const [resetPwd, setResetPwd] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/users`);
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newUser,
                    // Defaults
                    sex: 'female',
                    height_cm: 160,
                    weight_kg: 60,
                    activity_level: 'moderate',
                    goal: 'maintain',
                    is_admin: newUser.role === 'admin'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create');

            setMessage({ type: 'success', text: `User ${data.user.name} created!` });
            setNewUser({ name: '', email: '', password: '', role: 'user' });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    }

    async function handleResetPassword(userId) {
        if (!resetPwd || resetPwd.length < 4) {
            alert('Password too short');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/users/${userId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: resetPwd })
            });

            if (!res.ok) throw new Error('Failed to reset');

            alert('Password updated');
            setResetId(null);
            setResetPwd('');
        } catch (err) {
            alert(err.message);
        }
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Admin Portal</h1>

            <div className="card">
                <h2>Create New User</h2>
                <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label>Name</label>
                        <input className="input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                    </div>
                    <div>
                        <label>Email</label>
                        <input className="input" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                    </div>
                    <div>
                        <label>Password</label>
                        <input className="input" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                    </div>
                    <div>
                        <label>Role</label>
                        <select className="select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <button type="submit" className="btn btn-primary">Create User</button>
                    </div>
                </form>
                {message && <div style={{ marginTop: '10px', color: message.type === 'error' ? 'red' : 'green' }}>{message.text}</div>}
            </div>

            <div className="card">
                <h2>Manage Users</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>{u.id}</td>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        backgroundColor: u.role === 'admin' ? '#e0e7ff' : '#f3f4f6',
                                        color: u.role === 'admin' ? '#4338ca' : '#374151'
                                    }}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    {resetId === u.id ? (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="text"
                                                placeholder="New Pass"
                                                value={resetPwd}
                                                onChange={e => setResetPwd(e.target.value)}
                                                style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', width: '100px' }}
                                            />
                                            <button onClick={() => handleResetPassword(u.id)} className="btn btn-success" style={{ padding: '2px 8px', fontSize: '12px' }}>Save</button>
                                            <button onClick={() => setResetId(null)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }}>Cancel</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setResetId(u.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                                            Reset Password
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <NutrientManager />
        </div>
    );
}

function NutrientManager() {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('mg');
    const [target, setTarget] = useState('');
    const [status, setStatus] = useState(null);

    async function handleAddNutrient(e) {
        e.preventDefault();
        if (!name || !target) return;
        setStatus({ type: 'info', text: 'Creating & Starting Backfill...' });

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/admin/nutrients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    unit,
                    daily_target: Number(target),
                    category: 'mineral' // Defaulting to mineral/other
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStatus({ type: 'success', text: `Success! Added ${data.nutrient.name}. AI is backfilling data now...` });
            setName('');
            setTarget('');
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        }
    }

    return (
        <div className="card">
            <h2>Track New Nutrient</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                Adding a nutrient will automatically trigger an AI scan to estimate values for ALL existing foods in the database. This may take a few minutes to fully populate.
            </p>
            <form onSubmit={handleAddNutrient} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div>
                    <label>Nutrient Name</label>
                    <input className="input" placeholder="e.g. Omega 3" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                    <label>Unit</label>
                    <select className="select" value={unit} onChange={e => setUnit(e.target.value)}>
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="mcg">mcg</option>
                        <option value="IU">IU</option>
                    </select>
                </div>
                <div>
                    <label>Daily Target</label>
                    <input className="input" type="number" placeholder="e.g. 500" value={target} onChange={e => setTarget(e.target.value)} required />
                </div>
                <div>
                    <button type="submit" className="btn btn-primary">Add & Backfill</button>
                </div>
            </form>
            {status && (
                <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', backgroundColor: status.type === 'error' ? '#fee2e2' : '#dcfce7', color: status.type === 'error' ? '#b91c1c' : '#15803d' }}>
                    {status.text}
                </div>
            )}
        </div>
    );
}

export default AdminPage;
