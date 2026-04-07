require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Say hello in 5 words',
        });
        console.log('RESPONSE:', JSON.stringify(response, null, 2));
        if (response.text) console.log('TEXT:', response.text);
        if (response.response) console.log('NESTED RESPONSE:', response.response);
    } catch (e) {
        console.error('ERROR:', e);
    }
}
test();
