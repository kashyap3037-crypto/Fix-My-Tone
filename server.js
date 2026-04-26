require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
let genAI = null;
const MOCK_MODE = process.env.MOCK_MODE === 'true' || !process.env.GEMINI_API_KEY;

if (process.env.GEMINI_API_KEY) {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    console.log(`Gemini API Key detected (starts with: ${apiKey.substring(0, 6)}...). Initializing official SDK...`);
    genAI = new GoogleGenerativeAI(apiKey);
} else {
    console.warn('GEMINI_API_KEY is NOT set. Running in MOCK_MODE.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter - Tightened for 1000+ users/day to protect daily free quota
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 100, // Relaxed from 30 to 100 to allow more heavy testing
    message: { error: 'Server limit reach. try in 15m' },
    standardHeaders: true,
    legacyHeaders: false,
});

// API route
app.post('/api/convert', apiLimiter, async (req, res) => {
    const { input, tone, outputStyle } = req.body;

    if (!input) {
        return res.status(400).json({ error: 'Input text is required' });
    }

    if (MOCK_MODE) {
        console.log('Using MOCK response...');
        return res.json({ result: `[MOCK POLISH]: ${input} (Tone: ${tone})` });
    }

    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2
    ].filter(k => k && k.trim());

    if (keys.length === 0) {
        return res.status(500).json({ error: 'No API keys configured' });
    }

    const systemPrompt = `You are WordMasala AI Polisher. 
Tone: ${tone}. 
Output Style: ${outputStyle || 'Balanced'}. 
Task: Rewrite the following text to match the specified tone and style while keeping the original intent. 
Output ONLY the rewritten text without any quotes or additional comments.

Text to rewrite: "${input}"`;

    // 1. Try GEMINI
    if (process.env.GEMINI_API_KEY) {
        try {
            console.log('Attempting with GEMINI...');
            const apiKey = process.env.GEMINI_API_KEY.trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const geminiRes = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                })
            });

            if (geminiRes.ok) {
                const data = await geminiRes.json();
                const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (resultText) return res.json({ result: resultText.trim() });
            } else {
                const err = await geminiRes.json();
                console.warn('GEMINI Failed:', err.error?.message || 'Unknown error');
            }
        } catch (err) {
            console.error('GEMINI Error:', err.message);
        }
    }

    // 2. Fallback to GROQ
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_key_here') {
        try {
            console.log('Falling back to GROQ...');
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are WordMasala AI Polisher. Output ONLY the rewritten text." },
                        { role: "user", content: systemPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (groqRes.ok) {
                const data = await groqRes.json();
                const resultText = data.choices?.[0]?.message?.content;
                if (resultText) return res.json({ result: resultText.trim() });
            } else {
                const err = await groqRes.json();
                console.warn('GROQ Failed:', err.error?.message || 'Unknown error');
            }
        } catch (err) {
            console.error('GROQ Error:', err.message);
        }
    }

    // ALL FAILED
    res.status(500).json({ error: 'All AI providers reached their limit. Try again later.' });
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});