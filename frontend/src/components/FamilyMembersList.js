// frontend/src/components/FamilyMembersList.js
import React from 'react';

function FamilyMembersList({ users, onRefresh, loading }) {
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3>Family Members</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#28a745',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {users.length === 0 && (
        <p style={{ color: '#666' }}>No family members yet. Add one above.</p>
      )}

      {users.map((u) => (
        <div
          key={u.id}
          style={{
            borderBottom: '1px solid #eee',
            padding: '0.75rem 0',
            textAlign: 'left',
          }}
        >
          <strong>{u.name}</strong>
          <div style={{ fontSize: '0.9rem', color: '#555' }}>
            id: {u.id}{' '}
            {u.sex && <>• {u.sex}</>}
            {u.height_cm && <> • {u.height_cm} cm</>}
            {u.weight_kg && <> • {u.weight_kg} kg</>}
          </div>
          {(u.activity_level || u.goal) && (
            <div style={{ fontSize: '0.85rem', color: '#777' }}>
              {u.activity_level && <>Activity: {u.activity_level} </>}
              {u.goal && <>• Goal: {u.goal}</>}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

export default FamilyMembersList;
