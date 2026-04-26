const fetch = require('node-fetch');

async function test() {
    try {
        console.log('Hitting local server...');
        const res = await fetch('http://localhost:3000/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: 'Hello world',
                tone: 'Friendly',
                outputStyle: 'Balanced'
            })
        });
        
        const data = await res.json();
        console.log('Response status:', res.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

test();
