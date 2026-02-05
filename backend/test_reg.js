const API = 'http://localhost:4000/api';
(async () => {
    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Mom', email: 'mom@test.com', password: 'pass', is_admin: true })
        });
        console.log('Status:', res.status);
        console.log('Body:', await res.text());
    } catch (e) { console.error(e); }
})();
