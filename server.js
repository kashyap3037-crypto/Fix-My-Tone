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
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 50,
    message: { error: 'Rate limit exceeded! Please wait.' }
});

// API route
app.post('/api/convert', apiLimiter, async (req, res) => {
    const { input, tone } = req.body;

    if (!input) {
        return res.status(400).json({ error: 'Input required' });
    }

    try {
        let resultText = "";

        if (ai) {
            const prompt = `
Rewrite the following text into a professional "${tone}" tone.

Rules:
- Keep meaning same
- Remove rude/aggressive tone
- Make it polite and professional
- Convert Hinglish/Hindi to English if needed

Text: "${input}"
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            resultText = response.text;
        } else {
            resultText = `[MOCK]: ${input}`;
        }

        res.json({ result: resultText });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});