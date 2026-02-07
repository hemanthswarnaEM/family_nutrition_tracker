// frontend/src/pages/LogMealPage.js
import React, { useState, useEffect } from 'react';

import { API_BASE_URL as API_BASE } from '../config';

function LogMealPage() {
  const [currentUser, setCurrentUser] = useState(null);

  // Tabs: 'smart' (AI + Recipe Explode) or 'simple' (Single item)
  const [mode, setMode] = useState('smart');

  // Common State
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [mealType, setMealType] = useState('breakfast');
  const [message, setMessage] = useState(null);

  // Smart Mode State
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [smartItems, setSmartItems] = useState([]);

  // Recipe Scaling State
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [recipeOriginalWeight, setRecipeOriginalWeight] = useState(0);
  const [recipeConsumedWeight, setRecipeConsumedWeight] = useState('');
  const [pendingRecipeItems, setPendingRecipeItems] = useState([]);

  // Simple Mode State
  const [foodQuery, setFoodQuery] = useState('');
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [manualGrams, setManualGrams] = useState('');
  const [simpleSaving, setSimpleSaving] = useState(false);

  // Recent Logs & Editing State
  const [recentLogs, setRecentLogs] = useState([]);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editGrams, setEditGrams] = useState('');

  // Init
  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const u = JSON.parse(stored);
      setCurrentUser(u);
      setSelectedUserId(u.id);
    }
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch users & recipes
  useEffect(() => {
    if (isAdmin) {
      fetch(`${API_BASE}/users`).then(r => r.json()).then(setUsers).catch(console.error);
    }
    fetch(`${API_BASE}/recipes`).then(r => r.json()).then(setRecipes).catch(console.error);
  }, [isAdmin]);

  // Fetch Recent Logs
  useEffect(() => {
    fetchRecentLogs();
  }, [selectedUserId]);

  function fetchRecentLogs() {
    if (!selectedUserId) return;
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE}/logs/recent?user_id=${selectedUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setRecentLogs(d);
      })
      .catch(console.error);
  }

  // --- SMART HANDLERS ---

  function handleSaveSuccess() {
    fetchRecentLogs();
    // Clear smart items too?
    setSmartItems([]);
    setPendingRecipeItems([]);
    setRecipeConsumedWeight('');
  }

  async function handleAiAnalyze() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setSmartItems([]);
    setMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/ai/parse-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: aiText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Parse failed');

      const newItems = data.items.map(item => ({
        food_name: item.food_name,
        quantity_g: item.quantity_g,
        status: 'pending',
        matched_id: null,
        source: 'ai'
      }));
      setSmartItems(newItems);

      // Auto-search
      newItems.forEach((item, index) => resolveItem(item, index));

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAiLoading(false);
    }
  }

  // Resolve item: search DB or create custom (which now auto-fills nutrients!)
  async function resolveItem(item, index) {
    try {
      updateSmartItem(index, { status: 'searching' });

      // 1. Search
      const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(item.food_name)}`);
      const hits = await res.json();

      if (hits.length > 0) {
        updateSmartItem(index, { matched_id: hits[0].id, food_name: hits[0].name, status: 'ready' });
      } else {
        // 2. Create Custom (Backend will trigger AI nutrient estimation)
        const createRes = await fetch(`${API_BASE}/foods/custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.food_name })
        });
        const created = await createRes.json();
        if (createRes.ok) {
          updateSmartItem(index, { matched_id: created.id, food_name: created.name, status: 'ready' });
        } else {
          updateSmartItem(index, { status: 'error' });
        }
      }
    } catch (e) {
      console.error(e);
      updateSmartItem(index, { status: 'error' });
    }
  }

  function updateSmartItem(index, updates) {
    setSmartItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  }

  async function handleLogSmartItem(index) {
    const item = smartItems[index];
    if (!item.matched_id || item.status === 'logged') return;

    try {
      updateSmartItem(index, { status: 'saving' });

      await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          food_id: item.matched_id,
          grams: Number(item.quantity_g),
          meal_type: mealType
        })
      });

      updateSmartItem(index, { status: 'logged' });
    } catch (err) {
      updateSmartItem(index, { status: 'error' });
    }
  }

  async function handleLogAllSmart() {
    smartItems.forEach((item, idx) => {
      if (item.status === 'ready') handleLogSmartItem(idx);
    });
  }

  // --- REICPE EXPLODE & SCALING ---
  async function handleExplodeRecipe(recipeId) {
    if (!recipeId) {
      setSelectedRecipeId('');
      setPendingRecipeItems([]);
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recipes/${recipeId}`);
      if (!res.ok) throw new Error("Could not load recipe details");
      const recipe = await res.json();

      const ingredients = recipe.ingredients || [];
      const totalWeight = ingredients.reduce((sum, i) => sum + Number(i.quantity_g), 0);

      setRecipeOriginalWeight(totalWeight);
      setRecipeConsumedWeight(totalWeight); // Default to full recipe
      setSelectedRecipeId(recipeId);

      // Prepare items but don't add to list yet until user confirms scale
      const newItems = ingredients.map(ing => ({
        food_name: ing.food_name,
        quantity_g: ing.quantity_g,
        matched_id: ing.food_id,
        status: 'ready',
        source: 'recipe'
      }));
      setPendingRecipeItems(newItems);

    } catch (e) {
      setMessage({ type: 'error', text: "Failed to load recipe ingredients: " + e.message });
      setSelectedRecipeId('');
    } finally {
      setAiLoading(false);
    }
  }

  function handleAddScaledRecipe() {
    if (!pendingRecipeItems.length) return;

    const factor = Number(recipeConsumedWeight) / Number(recipeOriginalWeight);
    if (!factor || isNaN(factor)) return;

    const scaledItems = pendingRecipeItems.map(item => ({
      ...item,
      quantity_g: Math.round(item.quantity_g * factor)
    }));

    setSmartItems(prev => [...prev, ...scaledItems]);

    // Reset selection logic so they can add another
    setSelectedRecipeId('');
    setPendingRecipeItems([]);
    setRecipeConsumedWeight('');
  }

  // --- SIMPLE HANDLERS ---
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if we have a query and it's NOT the already selected item's name (to avoid reopen on selection)
      // Actually simpler: Just always search if query length > 1. 
      // We'll hide suggestions on selection.
      if (foodQuery.length >= 2 && mode === 'simple') {
        fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(foodQuery)}`)
          .then(r => r.json())
          .then(data => {
            setFoodOptions(data);
            setShowSuggestions(true);
          })
          .catch(console.error);
      } else {
        setFoodOptions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [foodQuery, mode]);

  function handleSelectFood(food) {
    setSelectedFoodId(food.id);
    setFoodQuery(food.name);
    setShowSuggestions(false);
  }

  function handleGenericChange(val) {
    setFoodQuery(val);
    setSelectedFoodId(''); // Clear ID if user modifies text (it becomes a custom entry or new search)
  }

  async function handleSimpleSubmit(e) {
    e.preventDefault();
    if (!selectedUserId || (!selectedFoodId && !foodQuery)) return;

    setSimpleSaving(true);
    try {
      // If custom text and no ID, create it first
      let finalFoodId = selectedFoodId;
      if (!finalFoodId && foodQuery) {
        const cr = await fetch(`${API_BASE}/foods/custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: foodQuery })
        });
        const d = await cr.json();
        finalFoodId = d.id;
      }

      await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          food_id: finalFoodId,
          grams: Number(manualGrams),
          meal_type: mealType
        })
      });
      setMessage({ type: 'success', text: "Logged successfully!" });
      setManualGrams('');
      setFoodQuery('');
      setFoodOptions([]);
      setSelectedFoodId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSimpleSaving(false);
    }
  }

  // ... (keeping existing functions)

  // ...

  function startEditLog(log) {
    setEditingLogId(log.id);
    setEditGrams(log.grams);
  }

  async function saveEditLog(logId) {
    try {
      const res = await fetch(`${API_BASE}/logs/${logId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ grams: Number(editGrams) })
      });
      if (res.ok) {
        setEditingLogId(null);
        fetchRecentLogs();
        if (typeof handleSaveSuccess === 'function') handleSaveSuccess();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteLog(logId) {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      const res = await fetch(`${API_BASE}/logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        setRecentLogs(prev => prev.filter(l => l.id !== logId));
        setMessage({ type: 'success', text: "Log deleted" });
        // Trigger refresh of dashboard/other data if needed
        if (typeof handleSaveSuccess === 'function') handleSaveSuccess();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "Could not delete log" });
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Log Meal</h1>
        {isAdmin && (
          <div style={{ width: '200px' }}>
            <select
              className="select"
              style={{ marginBottom: 0 }}
              value={selectedUserId || ''}
              onChange={e => setSelectedUserId(Number(e.target.value))}
            >
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${mode === 'smart' ? 'active' : ''}`} onClick={() => setMode('smart')}>Smart Log (AI)</button>
        <button className={`tab ${mode === 'simple' ? 'active' : ''}`} onClick={() => setMode('simple')}>Simple Entry</button>
      </div>

      <div className="card">
        <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Meal Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
            <button
              key={type}
              className={`btn ${mealType === type ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMealType(type)}
              style={{ textTransform: 'capitalize' }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {mode === 'smart' && (
        <div className="card">
          <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>What did you eat?</label>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Describe your meal naturally. AI will identify foods and estimate portions.
          </p>
          <textarea
            className="input"
            style={{ minHeight: '100px', fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="e.g. 2 Chapati, 1 cup Dal, and a small bowl of Curd..."
            value={aiText}
            onChange={e => setAiText(e.target.value)}
          />
          <div style={{ textAlign: 'right' }}>
            <button onClick={handleAiAnalyze} disabled={aiLoading} className="btn btn-primary">
              {aiLoading ? 'Analyzing...' : 'Analyze Meal'}
            </button>
          </div>

          {/* Smart Items Results */}
          {smartItems.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Identified Items</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {smartItems.map((item, idx) => (
                  <div key={idx} className="log-item" style={{
                    backgroundColor: item.status === 'logged' ? '#ecfdf5' : 'white',
                    borderColor: item.status === 'logged' ? '#10b981' : undefined
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#e0e7ff', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.9rem'
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1rem' }}>{item.food_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {item.quantity_g}g
                          {item.status === 'searching' && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>• Searching...</span>}
                          {item.status === 'ready' && <span style={{ color: '#10b981', marginLeft: '8px' }}>• Ready</span>}
                          {item.status === 'logged' && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ Logged</span>}
                        </div>
                      </div>
                    </div>

                    {item.status === 'ready' && (
                      <button onClick={() => handleLogSmartItem(idx)} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        Log
                      </button>
                    )}
                    {item.status === 'logged' && <span style={{ fontSize: '1.2rem' }}>✅</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button onClick={handleLogAllSmart} className="btn btn-primary">Log All Ready Items</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER SIMPLE MODE */}
      {mode === 'simple' && (
        <div className="card">
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Search Food</label>
            <input
              className="input"
              value={foodQuery}
              onChange={e => handleGenericChange(e.target.value)}
              placeholder="Start typing (e.g. Rice, Dosa)..."
              autoComplete="off"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && foodOptions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% - 1.25rem)', // overlaps slightly or just below
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0 0 12px 12px',
                zIndex: 100,
                maxHeight: '240px',
                overflowY: 'auto',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                {foodOptions.map(f => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFood(f)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: '500' }}>{f.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Quantity (grams)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 100"
              value={manualGrams}
              onChange={e => setManualGrams(e.target.value)}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button onClick={(e) => { handleSimpleSubmit(e).then(handleSaveSuccess) }} disabled={simpleSaving} className="btn btn-primary" style={{ minWidth: '120px' }}>
              {simpleSaving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`card`} style={{ backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5', color: message.type === 'error' ? '#b91c1c' : '#065f46', borderColor: 'transparent' }}>
          {message.text}
        </div>
      )}

      {/* RECENT ACTIVITY SECTION */}
      <div style={{ marginTop: '40px' }}>
        <h3>Recent Activity</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
          Edit or remove your recent entries here.
        </p>

        {recentLogs.length === 0 ? (
          <div className="card" style={{ fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
            No recent logs today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentLogs.map(log => (
              <div key={log.id} className="log-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.5rem' }}>🍽️</div>
                  <div>
                    <div style={{ fontWeight: '600' }}>{log.food_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(log.eaten_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {editingLogId === log.id ? (
                    <>
                      <input
                        type="number"
                        className="input"
                        value={editGrams}
                        onChange={e => setEditGrams(e.target.value)}
                        style={{ width: '80px', margin: 0, padding: '4px 8px' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>g</span>
                      <button onClick={() => saveEditLog(log.id)} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Save</button>
                      <button onClick={() => setEditingLogId(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontWeight: '600', marginRight: '10px' }}>{log.grams}g</span>
                      <button
                        onClick={() => startEditLog(log)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', border: 'none', background: 'transparent' }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', border: 'none', background: 'transparent', color: 'var(--danger)' }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default LogMealPage;
