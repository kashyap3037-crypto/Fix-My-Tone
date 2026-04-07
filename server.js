require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
let ai = null;
if (process.env.GEMINI_API_KEY) {
    console.log('Gemini API Key detected. Initializing v2026 SDK...');
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.error('CRITICAL: GEMINI_API_KEY is NOT set in environment!');
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

    if (!input || input.trim().length === 0) {
        return res.status(400).json({ error: 'Text required' });
    }

    try {
        if (!ai) {
            return res.json({ result: `[DEMO]: ${input}` });
        }

        const systemPrompt = `WordMasala AI Polisher. Tone: ${tone}. Style: ${outputStyle || 'Balanced'}. Rewrite text, keep intent, output ONLY result: "${input}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest', // Automatically uses the best available stable version
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        });

        let resultText = "";
        if (response && response.text) {
             resultText = response.text;
        } else if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
            resultText = response.candidates[0].content.parts[0].text;
        }

        if (!resultText) {
            throw new Error('AI empty response');
        }

        res.json({ result: resultText.trim() });

    } catch (error) {
        console.error('SERVER LOG - AI ERROR:', error);
        
        // Handle Gemini Quota Errors
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            // Check if it's the daily limit or just speed
            if (error.message && error.message.includes('quota')) {
                return res.status(429).json({ error: 'Daily free quota used up. Reset soon.' });
            }
            return res.status(429).json({ error: 'AI limit reach. try after 60s' });
        }
        
        if (error.status === 503 || (error.message && error.message.includes('503'))) {
            return res.status(503).json({ error: 'AI Busy. try in 10s' });
        }


        res.status(500).json({ error: 'AI error. please try again' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});