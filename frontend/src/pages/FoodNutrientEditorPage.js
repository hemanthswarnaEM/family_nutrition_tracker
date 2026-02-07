// frontend/src/pages/FoodNutrientEditorPage.js
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// table header + cell styles
const th = {
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  padding: '8px',
  fontWeight: 'bold',
};

const td = {
  borderBottom: '1px solid #f0f0f0',
  padding: '8px',
};

function FoodNutrientEditorPage() {
  const [currentUser, setCurrentUser] = useState(null);

  // --- food search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [selectedFoodName, setSelectedFoodName] = useState('');

  // --- nutrients state for selected food ---
  const [nutrientsData, setNutrientsData] = useState([]); // array from backend
  const [nutrientsLoading, setNutrientsLoading] = useState(false);
  const [nutrientsError, setNutrientsError] = useState(null);

  // --- editable values ---
  // nutrientInputs: { [nutrientCode]: '123.4' }
  const [nutrientInputs, setNutrientInputs] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  // Load current user from localStorage on first render
  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse currentUser from localStorage', e);
      }
    }
  }, []);

  // If not logged in
  if (!currentUser) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Food Nutrient Editor</h1>
        <p>You must be logged in to use this page.</p>
      </div>
    );
  }

  // If logged in but not admin
  if (currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Food Nutrient Editor</h1>
        <p>This page is only available to admin users.</p>
      </div>
    );
  }

  // --------------------------
  // Handlers
  // --------------------------

  // Search foods by name using backend /api/foods/search
  async function handleSearchFoods() {
    setSearchError(null);
    setSearchResults([]);
    setSaveMessage(null);
    setSaveError(null);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchError('Type at least 2 characters to search.');
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/foods/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search foods');
      }

      setSearchResults(data);
    } catch (err) {
      console.error('Food search error:', err);
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  // When user picks a food from dropdown
  function handleSelectFood(e) {
    const value = e.target.value;
    setSaveMessage(null);
    setSaveError(null);

    if (!value) {
      setSelectedFoodId(null);
      setSelectedFoodName('');
      setNutrientsData([]);
      setNutrientInputs({});
      setNutrientsError(null);
      return;
    }

    const id = Number(value);
    const food = searchResults.find((f) => f.id === id);

    setSelectedFoodId(id);
    setSelectedFoodName(food ? food.name : '');

    // clear previous nutrient data and inputs when picking a new food
    setNutrientsData([]);
    setNutrientInputs({});
    setNutrientsError(null);
  }

  // Load nutrient values for selected food via GET /api/foods/:id/nutrients
  async function handleLoadNutrients() {
    setNutrientsError(null);
    setNutrientsData([]);
    setNutrientInputs({});
    setSaveMessage(null);
    setSaveError(null);

    if (!selectedFoodId) {
      setNutrientsError('Please select a food first.');
      return;
    }

    setNutrientsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/foods/${selectedFoodId}/nutrients`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load nutrients for this food');
      }

      const rows = data.nutrients || [];
      setNutrientsData(rows);

      // build editable inputs from existing values
      const initialInputs = {};
      for (const n of rows) {
        // n.code is something like 'energy_kcal'
        if (n.amount_per_100g != null) {
          initialInputs[n.code] = String(n.amount_per_100g);
        } else {
          initialInputs[n.code] = '';
        }
      }
      setNutrientInputs(initialInputs);
    } catch (err) {
      console.error('Error loading food nutrients:', err);
      setNutrientsError(err.message);
    } finally {
      setNutrientsLoading(false);
    }
  }

  // When typing into an amount input
  function handleChangeAmount(code, value) {
    setNutrientInputs((prev) => ({
      ...prev,
      [code]: value,
    }));
  }

  // Save edited nutrient values via POST /api/foods/:id/nutrients
  async function handleSaveNutrients() {
    setSaveError(null);
    setSaveMessage(null);

    if (!selectedFoodId) {
      setSaveError('No food selected.');
      return;
    }

    // Build payload: only include values that are not empty and > 0
    const payloadNutrients = {};
    for (const [code, val] of Object.entries(nutrientInputs)) {
      const trimmed = (val || '').trim();
      if (!trimmed) continue; // skip empty fields

      const num = Number(trimmed);
      if (Number.isNaN(num) || num <= 0) {
        // skip invalid or non-positive values (backend also ignores <=0)
        continue;
      }

      payloadNutrients[code] = num;
    }

    if (Object.keys(payloadNutrients).length === 0) {
      setSaveError('Nothing to save. Please enter some positive numbers.');
      return;
    }

    setSaveLoading(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/foods/${selectedFoodId}/nutrients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nutrients: payloadNutrients }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save nutrient values');
      }

      // backend returns updated { food_id, nutrients: [...] }
      const updatedRows = data.nutrients || [];
      setNutrientsData(updatedRows);

      // also refresh inputs from updated data to stay consistent
      const newInputs = {};
      for (const n of updatedRows) {
        if (n.amount_per_100g != null) {
          newInputs[n.code] = String(n.amount_per_100g);
        } else {
          newInputs[n.code] = '';
        }
      }
      setNutrientInputs(newInputs);

      setSaveMessage('Nutrient values saved successfully ✅');
    } catch (err) {
      console.error('Error saving nutrient values:', err);
      setSaveError(err.message);
    } finally {
      setSaveLoading(false);
    }
  }

  // --------------------------
  // Render admin view
  // --------------------------

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Food Nutrient Editor</h1>
      <p>
        Welcome, {currentUser.name}! You are an admin ({currentUser.email}).
      </p>
      <p>
        Step 1: search for a food and select it. Step 2: load its nutrient
        values per 100g. Step 3: edit and save.
      </p>

      {/* Card: search + select food */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          marginTop: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>1. Choose a food</h2>

        {/* Search input + button */}
        <div style={{ display: 'flex', marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder="Type food name (e.g. Rice, Milk, Spinach)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginRight: '0.5rem',
            }}
          />
          <button
            type="button"
            onClick={handleSearchFoods}
            disabled={searchLoading}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: searchLoading ? 'default' : 'pointer',
            }}
          >
            {searchLoading ? 'Searching...' : 'Search foods'}
          </button>
        </div>

        {/* Search error */}
        {searchError && (
          <p style={{ color: 'red', marginBottom: '0.75rem' }}>
            {searchError}
          </p>
        )}

        {/* Results dropdown */}
        {searchResults.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{ display: 'block', marginBottom: '0.3rem' }}
            >
              Matching foods
            </label>
            <select
              value={selectedFoodId || ''}
              onChange={handleSelectFood}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            >
              <option value="">-- Select a food --</option>
              {searchResults.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (id: {f.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected food summary */}
        {selectedFoodId && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
            }}
          >
            <strong>Selected food:</strong> {selectedFoodName} (id:{' '}
            {selectedFoodId})
          </div>
        )}
      </div>

      {/* Card: nutrient values (view + edit) */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '900px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>2. Edit nutrient values (per 100g)</h2>

        <p style={{ marginBottom: '0.75rem' }}>
          Select a food above, then load its nutrient data. You can then edit
          the values per 100g and save them. Leave a field blank to keep it
          unset.
        </p>

        <button
          type="button"
          onClick={handleLoadNutrients}
          disabled={nutrientsLoading || !selectedFoodId}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: selectedFoodId ? '#28a745' : '#6c757d',
            color: 'white',
            cursor:
              nutrientsLoading || !selectedFoodId ? 'default' : 'pointer',
            marginBottom: '0.75rem',
          }}
        >
          {nutrientsLoading
            ? 'Loading nutrients...'
            : 'Load nutrients for selected food'}
        </button>

        {nutrientsError && (
          <p style={{ color: 'red', marginBottom: '0.75rem' }}>
            {nutrientsError}
          </p>
        )}

        {/* Save status */}
        {saveError && (
          <p style={{ color: 'red', marginBottom: '0.75rem' }}>
            {saveError}
          </p>
        )}
        {saveMessage && (
          <p style={{ color: 'green', marginBottom: '0.75rem' }}>
            {saveMessage}
          </p>
        )}

        {/* Table of nutrients with editable inputs */}
        {nutrientsData && nutrientsData.length > 0 && (
          <>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Nutrient</th>
                  <th style={th}>Unit</th>
                  <th style={th}>Category</th>
                  <th style={th}>Amount per 100g</th>
                </tr>
              </thead>
              <tbody>
                {nutrientsData.map((n) => (
                  <tr key={n.id}>
                    <td style={td}>{n.name}</td>
                    <td style={td}>{n.unit}</td>
                    <td style={td}>{n.category}</td>
                    <td style={td}>
                      <input
                        type="number"
                        step="0.01"
                        value={nutrientInputs[n.code] ?? ''}
                        onChange={(e) =>
                          handleChangeAmount(n.code, e.target.value)
                        }
                        placeholder="e.g. 345"
                        style={{
                          width: '100%',
                          padding: '0.3rem',
                          borderRadius: '4px',
                          border: '1px solid #ccc',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              onClick={handleSaveNutrients}
              disabled={saveLoading || !selectedFoodId}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#007bff',
                color: 'white',
                cursor:
                  saveLoading || !selectedFoodId ? 'default' : 'pointer',
              }}
            >
              {saveLoading ? 'Saving...' : 'Save nutrient values'}
            </button>
          </>
        )}

        {selectedFoodId &&
          (!nutrientsData || nutrientsData.length === 0) &&
          !nutrientsLoading &&
          !nutrientsError && (
            <p style={{ marginTop: '0.5rem' }}>
              No nutrient values found yet for this food. You can enter values
              and click save after loading the nutrient list.
            </p>
          )}
      </div>
    </div>
  );
}

export default FoodNutrientEditorPage;
