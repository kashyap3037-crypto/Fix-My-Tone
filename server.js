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

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i].trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            console.log(`Attempting with API Key ${i + 1}...`);
            const apiResponse = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                const error = new Error(errorData.error?.message || 'AI Request Failed');
                error.status = apiResponse.status;
                error.details = errorData;
                
                // If it's a quota error and we have more keys, continue to next key
                if (error.status === 429 && i < keys.length - 1) {
                    console.warn(`Key ${i + 1} quota exceeded, falling back to next key...`);
                    lastError = error;
                    continue;
                }
                throw error;
            }

            const data = await apiResponse.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!resultText) {
                throw new Error('AI empty response');
            }

            return res.json({ result: resultText.trim() });

        } catch (error) {
            lastError = error;
            console.error(`Error with Key ${i + 1}:`, error.message);
            // If it's not a quota error, don't necessarily wait for next key if it's a 400 etc. 
            // but for now let's try all keys regardless of error type if it fails
            if (i < keys.length - 1) continue;
        }
    }

    // If we reach here, all keys failed
    const error = lastError || new Error('All API keys failed');
    console.error('FINAL ERROR:', error);
    
    if (error.status === 429) {
        return res.status(429).json({ error: 'All API daily limits reached. try in 24h.' });
    }
    
    res.status(error.status || 500).json({ error: `AI error: ${error.message || 'Please try again later.'}` });
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});