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
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        });

        // Robust extraction for @google/genai SDK (v1.48.0 - 2026)
        let resultText = "";
        
        // In @google/genai, response.text is a getter or property
        if (response && response.text) {
             resultText = response.text;
        } else if (response && response.candidates?.[0]?.content?.parts?.[0]?.text) {
            resultText = response.candidates[0].content.parts[0].text;
        }

        if (!resultText) {
            console.error('Empty AI Response:', JSON.stringify(response, null, 2));
            throw new Error('AI returned an empty response. This might be a safety block or service issue.');
        }

        res.json({ result: resultText.trim() });

    } catch (error) {
        console.error('CRITICAL AI ERROR:', error);
        
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            return res.status(429).json({ error: 'AI limit reach. try after 60s' });
        }
        
        if (error.status === 503 || (error.message && error.message.includes('503'))) {
            return res.status(503).json({ error: 'AI busy. try in 10s' });
        }

        res.status(500).json({ error: 'Failed to polish text. AI might have blocked the input for safety.' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`WordMasala backend running on port ${port}`);
});