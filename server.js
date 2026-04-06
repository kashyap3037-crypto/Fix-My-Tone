require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Gen AI
let ai = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Setup SQLite database for local storage
const db = new sqlite3.Database('./history.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS conversions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_text TEXT,
            tone TEXT,
            converted_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('Connected to the local SQLite database.');
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiter Setup (Protecting Free API)
// Default to the user's recommended 'Live Portfolio' cap of 50 requests per 15 mins.
// For Testing, use 20. For Public Launch, use 100.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 50, // max requests per windowMs
    message: { error: 'Rate limit exceeded! Please wait a few minutes before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting specifically to the conversion endpoint 
app.post('/api/convert', apiLimiter, async (req, res) => {
    const { input, tone } = req.body;

    if (!input) {
        return res.status(400).json({ error: 'Input text is required' });
    }

    let resultText = '';

    try {
        if (ai) {
            const prompt = `Rewrite the following text in a "${tone}" tone. Provide only the rewritten text without any additional commentary:

Text: "${input}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            resultText = response.text;
        } else {
            // Mock response if no API key is set
            resultText = `[MOCK - ${tone}]: ${input} (Please set GEMINI_API_KEY in .env)`;
        }

        // Store to local database
        db.run(
            `INSERT INTO conversions (original_text, tone, converted_text) VALUES (?, ?, ?)`,
            [input, tone || 'Professional', resultText],
            function (err) {
                if (err) {
                    console.error('Error saving to DB:', err);
                } else {
                    console.log(`Saved conversion ID ${this.lastID} to local database.`);
                }
            }
        );

        res.json({ result: resultText });
    } catch (error) {
        console.error('Error during conversion:', error.message || error);
        res.status(500).json({ error: error.message || 'Failed to convert text.' });
    }
});

// Endpoint to fetch history
app.get('/api/history', (req, res) => {
    db.all(`SELECT * FROM conversions ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching history:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        } else {
            res.json(rows);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
