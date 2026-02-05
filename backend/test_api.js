const API = 'http://localhost:4000/api';

async function test() {
    console.log('--- TEST START ---');

    // 1. Health
    try {
        const h = await fetch(`${API}/health`);
        console.log('Health:', h.status, await h.json());
    } catch (e) {
        console.error('Health Check Failed (Ensure server is running)', e);
        process.exit(1);
    }

    // 2. Register
    const email = `test${Date.now()}@example.com`;
    let token = '';
    let userId = '';
    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Mom',
                email,
                password: 'securepassword123',
                sex: 'female',
                height_cm: 165,
                weight_kg: 60,
                activity_level: 'moderate',
                goal: 'maintain'
            })
        });
        const data = await res.json();
        console.log('Register:', res.status);
        if (!res.ok) throw new Error(JSON.stringify(data));
        token = data.token;
        userId = data.user.id;
    } catch (e) {
        console.error('Register Failed', e);
        process.exit(1);
    }

    // 3. Login
    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'securepassword123' })
        });
        const data = await res.json();
        console.log('Login:', res.status, data.token ? 'Has Token' : 'No Token');
        if (!res.ok) throw new Error(JSON.stringify(data));
    } catch (e) {
        console.error('Login Failed', e);
        process.exit(1);
    }

    // 4. Analytics (Authenticated)
    try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`${API}/analytics/day?user_id=${userId}&date=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Analytics:', res.status, 'Data keys:', Object.keys(data));
    } catch (e) {
        console.error('Analytics Failed', e);
    }

    console.log('--- TEST PASS ---');
}

test();
