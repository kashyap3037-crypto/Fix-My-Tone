require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        console.log('Testing AI with gemini-2.5-flash...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Say hi in a professional way.'
        });
        
        console.log('--- RAW RESPONSE ---');
        console.log(JSON.stringify(response, null, 2));
        
        console.log('--- EXTRACTED TEXT ---');
        console.log(response.text);

    } catch (e) {
        console.error('ERROR during test:', e);
    }
}

test();
