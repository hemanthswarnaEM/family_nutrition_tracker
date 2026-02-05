
const API_BASE = 'http://localhost:4000/api';

async function testDashboard() {
    console.log("Checking Dashboard Data...");

    try {
        // 1. Get Token
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'debug@test.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) {
            console.error("Login failed:", loginData);
            return;
        }
        const userId = loginData.user.id;
        console.log("Logged in as UserID:", userId);

        // 2. Fetch Stats BEFORE logging
        const today = new Date().toISOString().slice(0, 10);
        const initialStatsRes = await fetch(`${API_BASE}/analytics/day?user_id=${userId}&date=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const initialStats = await initialStatsRes.json();
        console.log("Full Initial Response:", JSON.stringify(initialStats, null, 2));
        console.log("Initial Stats Type:", Array.isArray(initialStats.nutrients) ? "Array" : typeof initialStats.nutrients);

        let initialCals = 0;
        if (Array.isArray(initialStats.nutrients)) {
            initialCals = initialStats.nutrients.find(n => n.code === 'energy_kcal')?.total_amount || 0;
        }
        console.log("Initial Cals:", initialCals);

        // 3. Log "Black Pepper"
        let foodId;
        const searchRes = await fetch(`${API_BASE}/foods/search?q=pepper`);
        const searchData = await searchRes.json();
        if (searchData.length > 0) {
            foodId = searchData[0].id; // Use first match (Black Pepper fallback or real)
        } else {
            console.log("No pepper found, creating...");
            const createRes = await fetch(`${API_BASE}/foods/custom`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Debug Pepper' })
            });
            const d = await createRes.json();
            foodId = d.id;
        }

        console.log(`Logging Food ID: ${foodId}...`);
        const logRes = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                food_id: foodId,
                grams: 100,
                meal_type: 'snack'
            })
        });
        console.log("Log Result:", logRes.status);

        // 4. Fetch Stats AFTER logging
        const finalStatsRes = await fetch(`${API_BASE}/analytics/day?user_id=${userId}&date=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalStats = await finalStatsRes.json();
        console.log("Full Final Response:", JSON.stringify(finalStats, null, 2));

        let finalCals = 0;
        if (Array.isArray(finalStats.nutrients)) {
            finalCals = finalStats.nutrients.find(n => n.code === 'energy_kcal')?.total_amount || 0;
        }
        console.log("Final Cals:", finalCals);

        if (finalCals > initialCals) {
            console.log("SUCCESS: Dashboard updated!");
        } else {
            console.log("FAIL: Dashboard not updated.");
        }

    } catch (e) {
        console.error("Test Error:", e);
    }
}

testDashboard();
