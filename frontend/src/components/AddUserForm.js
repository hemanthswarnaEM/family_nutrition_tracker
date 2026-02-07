// frontend/src/components/AddUserForm.js
import React, { useState } from 'react';
import { API_BASE } from '../config';

function AddUserForm({ onUserCreated }) {
  // Local form state
  const [name, setName] = useState('');
  const [sex, setSex] = useState('male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintenance');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSaveUser(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      sex,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      activity_level: activityLevel,
      goal,
    };

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Create user error:', body);
        throw new Error(body.error || 'Failed to create user');
      }

      const created = await res.json();
      setSuccess(`Saved user: ${created.name} (id ${created.id})`);

      // Clear form
      setName('');
      setSex('male');
      setHeightCm('');
      setWeightKg('');
      setActivityLevel('moderate');
      setGoal('maintenance');

      // Tell parent to refresh users list
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        maxWidth: '700px',
        margin: '0 auto 2rem auto',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <h3 style={{ marginBottom: '1rem' }}>Add a Family Member</h3>

      <form onSubmit={handleSaveUser}>
        {/* NAME */}
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Name:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dad, Mom, Hemanth"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        {/* SEX */}
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Sex:
          </label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other / Prefer not to say</option>
          </select>
        </div>

        {/* HEIGHT + WEIGHT */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Height (cm):
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 183"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Weight (kg):
            </label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 74"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
          </div>
        </div>

        {/* ACTIVITY LEVEL */}
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Activity Level:
          </label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="sedentary">Sedentary (little exercise)</option>
            <option value="light">Light (1–3 days/week)</option>
            <option value="moderate">Moderate (3–5 days/week)</option>
            <option value="active">Active (6–7 days/week)</option>
          </select>
        </div>

        {/* GOAL */}
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Goal:
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="maintenance">Maintenance</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="fat_loss">Fat Loss</option>
            <option value="weight_gain">Weight Gain</option>
          </select>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: saving ? '#6c757d' : '#007bff',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save User'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}>
          ⚠ {error}
        </p>
      )}
      {success && (
        <p style={{ color: 'green', marginTop: '1rem' }}>
          ✅ {success}
        </p>
      )}

      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
        Later we will use height, weight, activity and goal to calculate calories and
        nutrition targets for each family member.
      </p>
    </section>
  );
}

export default AddUserForm;
