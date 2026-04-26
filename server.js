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

    if (!input || input.trim().length === 0) {
        return res.status(400).json({ error: 'Text required' });
    }

    try {
        if (MOCK_MODE || !genAI) {
            console.log('Using MOCK response...');
            return res.json({ result: `[MOCK POLISH]: ${input} (Tone: ${tone})` });
        }

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
            }
        });

        const systemPrompt = `You are WordMasala AI Polisher. 
Tone: ${tone}. 
Output Style: ${outputStyle || 'Balanced'}. 
Task: Rewrite the following text to match the specified tone and style while keeping the original intent. 
Output ONLY the rewritten text without any quotes or additional comments.

Text to rewrite: "${input}"`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const resultText = response.text();

        if (!resultText) {
            throw new Error('AI empty response');
        }

        res.json({ result: resultText.trim() });

    } catch (error) {
        console.error('SERVER LOG - AI ERROR:', error);
        
        // Handle Gemini Quota Errors
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                return res.status(429).json({ error: 'Daily free quota used up. Reset soon.' });
            }
            return res.status(429).json({ error: 'AI limit reach. try after 60s' });
        }
        
        if (error.status === 400 || (error.message && error.message.includes('400'))) {
             console.error('DETAILED 400 ERROR:', JSON.stringify(error, null, 2));
             return res.status(400).json({ error: `Invalid request: ${error.message || 'Check your input.'}` });
        }

        if (error.status === 503 || (error.message && error.message.includes('503'))) {
            return res.status(503).json({ error: 'AI Busy. try in 10s' });
        }

        res.status(500).json({ error: `AI error: ${error.message || 'Please try again later.'}` });
    }
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});