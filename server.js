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
    const { input, tone, outputStyle } = req.body;

    if (!input) {
        return res.status(400).json({ error: 'Input required' });
    }

    try {
        let resultText = "";

        if (ai) {
            const prompt = `You are a professional writing assistant.

Your task: Rewrite the user's text to match the requested tone and output style.

Tone: "${tone}"
Output Style: "${outputStyle || 'Balanced Professional'}"

STRICT RULES — follow every single one:
1. Return ONLY the rewritten text. Nothing else.
2. Do NOT include any headers, labels, bullet explanations, or notes.
3. Do NOT write things like "Key Changes:", "Note:", "Here is the rewrite:", or any meta-commentary.
4. Do NOT use markdown formatting like ** or * for bold/italic.
5. Keep the original meaning perfectly intact — only change the tone and style.
6. Convert any Hinglish or Hindi words to formal English.
7. Remove all rude, aggressive, or informal language.
8. Match the Output Style:
   - "Highly Formal (Corporate)": Long, structured, impersonal corporate language.
   - "Balanced Professional": Warm but professional; suitable for emails and messages.
   - "Concise & Direct": Short, punchy, action-oriented. No fluff.

User's original text:
"${input}"

Respond with ONLY the rewritten text:`;

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