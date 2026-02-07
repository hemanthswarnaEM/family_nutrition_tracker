// frontend/src/pages/RecipesPage.js
import React, { useState, useEffect } from 'react';

import { API_BASE_URL as API_BASE } from '../config';

function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search State
  const [recipeSearch, setRecipeSearch] = useState('');

  // Create/Edit Mode
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Main');
  const [newTotalWeight, setNewTotalWeight] = useState('');

  // Ingredients for new/edit recipe
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [ingQuantity, setIngQuantity] = useState('');

  const [stagedIngredients, setStagedIngredients] = useState([]);

  // Auth check for edit permission
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('currentUser');
    if (u) setCurrentUser(JSON.parse(u));
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recipes`);
      const data = await res.json();
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchFood() {
    if (!ingredientSearch) return;
    try {
      // 1. Try Local Search
      const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(ingredientSearch)}`);
      const data = await res.json();

      if (data.length > 0) {
        setSearchResults(data);
      } else {
        // 2. Auto-Trigger Smart Find
        // Optional: let user know we are expanding search
        const confirmSmart = window.confirm(`No approximate matches for "${ingredientSearch}" in database.\n\nTry AI Smart Find to check for synonyms or create it?`);
        if (confirmSmart) {
          await handleSmartAdd();
        }
      }
    } catch (e) {
      alert("Search failed");
    }
  }

  async function handleSmartAdd() {
    if (!ingredientSearch) return;
    // Show some loading indicator ideally, but alert/toast works for now
    // Changing button text to "Search..." might be good in full React app
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/foods/smart-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: ingredientSearch })
      });
      const data = await res.json();

      if (data.food) {
        setSelectedFood(data.food);
        setSearchResults([]);
        // setIngQuantity(''); 
        alert(`Found: ${data.food.name}\nType: ${data.type === 'created' ? 'Created New Entry' : 'Existing Match'}`);
      } else {
        alert("Could not identify food. Please try a different name.");
      }
    } catch (e) {
      alert("Smart Add failed: " + e.message);
    }
  }

  function handleAddIngredient() {
    if (!selectedFood || !ingQuantity) return;
    setStagedIngredients([...stagedIngredients, {
      food_id: selectedFood.id,
      name: selectedFood.name, // 'name' for UI display
      food_name: selectedFood.name, // handle potential backend naming difference
      quantity_g: Number(ingQuantity)
    }]);
    // Reset
    setSelectedFood(null);
    setIngQuantity('');
    setIngredientSearch('');
    setSearchResults([]);
  }

  function handleRemoveIngredient(idx) {
    const list = [...stagedIngredients];
    list.splice(idx, 1);
    setStagedIngredients(list);
  }

  function getIngredientName(ing) {
    return ing.name || ing.food_name || 'Unknown Food';
  }

  // Populate form for editing
  async function handleEditClick(recipe) {
    // Need to fetch full details including ingredients
    try {
      const res = await fetch(`${API_BASE}/recipes/${recipe.id}`);
      const fullRecipe = await res.json();

      setNewName(fullRecipe.name);
      setNewCategory(fullRecipe.category || 'Main');
      setNewTotalWeight(fullRecipe.total_cooked_weight_g || '');
      // Map backend ingredients to staged format
      setStagedIngredients(fullRecipe.ingredients.map(i => ({
        food_id: i.food_id,
        name: i.food_name,
        quantity_g: Number(i.quantity_g)
      })));

      setEditMode(true);
      setEditingId(recipe.id);
      setShowForm(true);
    } catch (e) {
      alert("Failed to load recipe details");
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditMode(false);
    setEditingId(null);
    setNewName('');
    setNewCategory('Main');
    setNewTotalWeight('');
    setStagedIngredients([]);
  }

  async function handleSaveRecipe(e) {
    e.preventDefault();
    if (!newName) return;

    let weight = newTotalWeight ? Number(newTotalWeight) : 0;
    if (!weight && stagedIngredients.length > 0) {
      weight = stagedIngredients.reduce((sum, i) => sum + Number(i.quantity_g), 0);
    }

    const payload = {
      name: newName,
      category: newCategory,
      total_cooked_weight_g: weight,
      ingredients: stagedIngredients.map(i => ({ food_id: i.food_id, quantity_g: i.quantity_g }))
    };

    try {
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE}/recipes`;
      let method = 'POST';

      if (editMode && editingId) {
        url = `${API_BASE}/recipes/${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save recipe");

      await fetchRecipes(); // refresh list
      resetForm();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteRecipe(recipeId) {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setRecipes(recipes.filter(r => r.id !== recipeId));
      } else {
        throw new Error("Failed to delete recipe");
      }
    } catch (e) {
      alert(e.message);
    }
  }

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    r.category.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Recipes</h1>

        <div style={{ display: 'flex', gap: '15px' }}>
          {!showForm && (
            <input
              className="input"
              style={{ margin: 0, width: '250px' }}
              placeholder="Search recipes..."
              value={recipeSearch}
              onChange={e => setRecipeSearch(e.target.value)}
            />
          )}

          {!showForm && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Create New Recipe</button>
          )}
        </div>
      </div>

      {showForm ? (
        <div className="card">
          <h2>{editMode ? 'Edit Recipe' : 'New Recipe'}</h2>
          <form onSubmit={handleSaveRecipe}>
            <div style={{ marginBottom: '15px' }}>
              <label>Recipe Name</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g. Mom's Sambar" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
              <div>
                <label>Category</label>
                <select className="select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  <option>Main</option>
                  <option>Side</option>
                  <option>Soup</option>
                  <option>Dessert</option>
                </select>
              </div>
              <div>
                <label>Total Cooked Weight (g)</label>
                <input type="number" className="input" value={newTotalWeight} onChange={e => setNewTotalWeight(e.target.value)} placeholder="Auto-sum if empty" />
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Ingredients</h3>

            <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  className="input"
                  style={{ marginBottom: 0 }}
                  placeholder="Search ingredient... (e.g. 'Rice', 'Bhindi')"
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleSearchFood}>Search</button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <select className="select" onChange={e => {
                    const food = searchResults.find(f => f.id === Number(e.target.value));
                    setSelectedFood(food);
                  }}>
                    <option value="">Select ingredient...</option>
                    {searchResults.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}

              {selectedFood && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span><strong>{selectedFood.name}</strong></span>
                  <input
                    type="number"
                    className="input"
                    style={{ marginBottom: 0, width: '100px' }}
                    placeholder="Grams"
                    value={ingQuantity}
                    onChange={e => setIngQuantity(e.target.value)}
                  />
                  <button type="button" className="btn btn-success" onClick={handleAddIngredient}>Add</button>
                </div>
              )}
            </div>

            {stagedIngredients.length > 0 && (
              <table style={{ marginBottom: '20px' }}>
                <thead>
                  <tr><th>Ingredient</th><th>Qty (g)</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {stagedIngredients.map((ing, idx) => (
                    <tr key={idx}>
                      <td>{getIngredientName(ing)}</td>
                      <td>{ing.quantity_g}</td>
                      <td><button type="button" onClick={() => handleRemoveIngredient(idx)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">{editMode ? 'Update Recipe' : 'Save Recipe'}</button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          {loading ? <p>Loading...</p> : (
            recipes.length === 0 ? <p>No recipes found.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {filteredRecipes.map(r => (
                  <div key={r.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', position: 'relative' }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>{r.name}</h3>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{r.category}</div>
                    <div style={{ marginTop: '10px', fontWeight: 'bold' }}>{Math.round(r.total_cooked_weight_g)}g total</div>

                    {/* Show Created Date if available */}
                    {r.created_at && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                        Added: {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    )}

                    {/* Edit Button */}
                    {(currentUser && (currentUser.role === 'admin' || currentUser.id === r.created_by_user_id)) && (
                      <button
                        onClick={() => handleEditClick(r)}
                        className="btn btn-secondary"
                        style={{ marginTop: '10px', width: '100%', padding: '5px' }}
                      >
                        Edit Recipe ✏️
                      </button>
                    )}

                    {/* Delete Button */}
                    {(currentUser && (currentUser.role === 'admin' || currentUser.id === r.created_by_user_id)) && (
                      <button
                        onClick={() => handleDeleteRecipe(r.id)}
                        className="btn btn-danger"
                        style={{ marginTop: '5px', width: '100%', padding: '5px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none' }}
                      >
                        Delete 🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default RecipesPage;
