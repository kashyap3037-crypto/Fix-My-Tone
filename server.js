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
    // 1000+ users/day fits well within Gemini 1.5 Flash Free Tier (15 RPM / 1500 RPD)
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter - Tightened for 1000+ users/day to protect daily free quota
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 30, // 30 requests per window ensures one person doesn't exhaust the 1500 RPD quota
    message: { error: 'Cooling down! Please wait a bit so we can keep the service free for others too.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// API route
app.post('/api/convert', apiLimiter, async (req, res) => {
    const { input, tone, outputStyle } = req.body;

    if (!input || input.trim().length === 0) {
        return res.status(400).json({ error: 'Input text is required' });
    }

    try {
        if (!ai) {
            return res.json({ result: `[DEMO MODE]: ${input} (Tone: ${tone})` });
        }

        const systemPrompt = `You are "WordMasala", a high-performance AI text polisher.
Your goal is to transform raw, messy, or informal text into the requested tone while maintaining the original intent.

STRICT INSTRUCTIONS:
1. Return ONLY the rewritten text. No introductions, no explanations, no quotes.
2. Tone to apply: "${tone}"
3. Output Style: "${outputStyle || 'Balanced'}"

TONE GUIDELINES:
- Professional: Clear, respectful, and workplace-appropriate.
- Casual: Relaxed, friendly, like talking to a peer.
- Friendly: Warm, approachable, and positive.
- Funny: Witty, lighthearted, and humorous.
- Gen-Z: Modern slang, lowercase (if appropriate), expressive, uses emojis sparingly.
- Corporate: Formal, structured, using business terminology.
- Polite: Extremely courteous and softened.

FORMATTING RULES:
- Convert Hinglish/Hindi to English if the tone suggests it (default to English).
- No markdown formatting.
- Maximum 1000 characters.

Text to transform:
"${input}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: systemPrompt,
        });

        // Robust extraction for @google/genai SDK
        let resultText = "";
        
        if (typeof response.text === 'string') {
            resultText = response.text;
        } else if (typeof response.text === 'function') {
            resultText = response.text();
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            resultText = response.candidates[0].content.parts[0].text;
        } else if (response.response?.text) {
            resultText = typeof response.response.text === 'function' ? response.response.text() : response.response.text;
        }

        if (!resultText) {
            console.error('Incomplete AI Response:', JSON.stringify(response, null, 2));
            throw new Error('AI returned an empty response. This usually happens due to safety filters.');
        }

        res.json({ result: resultText.trim() });

    } catch (error) {
        console.error('AI Error Detail:', error);
        
        if (error.message?.includes('429')) {
            return res.status(429).json({ error: 'Daily/Minute limit reached. Please try again later.' });
        }
        res.status(500).json({ error: 'Failed to polish text. AI might have blocked the input for safety.' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});