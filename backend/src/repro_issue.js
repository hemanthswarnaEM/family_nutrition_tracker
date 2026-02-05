import fetch from 'node-fetch';

const API = 'http://localhost:4000/api';

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'hemanth@family.local', password: '070411' })
        });

        if (!loginRes.ok) {
            const txt = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} ${txt}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        const userId = loginData.user.id;
        console.log('Login success, Token:', token.substring(0, 10) + '...', 'UserID:', userId);

        // 2. Update Profile
        console.log('Updating profile...');
        const payload = {
            name: 'hemanth',
            email: 'hemanth@family.local',
            sex: 'male',
            date_of_birth: '1980-01-01', // Example date
            height_cm: 175,
            weight_kg: 70,
            activity_level: 'moderate'
        };

        const updateRes = await fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!updateRes.ok) {
            const txt = await updateRes.text();
            throw new Error(`Update failed: ${updateRes.status} ${txt}`);
        }

        const updated = await updateRes.json();
        console.log('Update success:', updated);

    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

run();
