require('dotenv').config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    console.log('Testing with direct fetch...');
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }]
            })
        });
        
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

test();
