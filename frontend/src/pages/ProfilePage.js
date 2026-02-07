// frontend/src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';

import { API_BASE_URL as API_BASE } from '../config';

function ProfilePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        sex: 'male',
        date_of_birth: '',
        height_cm: '',
        weight_kg: '',
        activity_level: 'sedentary'
    });

    useEffect(() => {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            const u = JSON.parse(stored);
            setCurrentUser(u);
            fetchProfile(u.id);
        }
    }, []);

    async function fetchProfile(userId) {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    sex: data.sex || 'male',
                    date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
                    height_cm: data.height_cm || '',
                    weight_kg: data.weight_kg || '',
                    activity_level: data.activity_level || 'sedentary'
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save profile");

            const updated = data;
            // Update local storage name if changed
            const newCu = { ...currentUser, name: updated.name, role: updated.role }; // keep basic fields
            localStorage.setItem('currentUser', JSON.stringify(newCu));
            setCurrentUser(newCu);

            setMessage({ type: 'success', text: 'Profile saved! Nutrition targets will update automatically.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    }

    if (!currentUser) return <div className="container">Please Login</div>;
    if (loading) return <div className="container">Loading Profile...</div>;

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <h1>My Profile</h1>

            <div className="card">
                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Name</label>
                        <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label>Email (Login)</label>
                        <input className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label>Sex</label>
                            <select className="select" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <div>
                            <label>Date of Birth</label>
                            <input type="date" className="input" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                        <div>
                            <label>Height (cm)</label>
                            <input type="number" className="input" value={formData.height_cm} onChange={e => setFormData({ ...formData, height_cm: e.target.value })} placeholder="e.g. 175" />
                        </div>
                        <div>
                            <label>Weight (kg)</label>
                            <input type="number" className="input" value={formData.weight_kg} onChange={e => setFormData({ ...formData, weight_kg: e.target.value })} placeholder="e.g. 70" />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px', marginTop: '15px' }}>
                        <label>Activity Level</label>
                        <select className="select" value={formData.activity_level} onChange={e => setFormData({ ...formData, activity_level: e.target.value })}>
                            <option value="sedentary">Sedentary (Classic office job)</option>
                            <option value="light">Lightly Active (1-3 days/week)</option>
                            <option value="moderate">Moderately Active (3-5 days/week)</option>
                            <option value="active">Active (6-7 days/week)</option>
                            <option value="very_active">Very Active (Physical job + training)</option>
                        </select>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            This is used to calculate your daily calorie burn (TDEE).
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            {message && (
                <div className="card" style={{ marginTop: '20px', backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5', color: message.type === 'error' ? '#b91c1c' : '#065f46' }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default ProfilePage;
