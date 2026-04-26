require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
    try {
        console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        console.log('Attempting to generate content...');
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', 
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        });
        
        console.log('Response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error details:', error);
        if (error.response) {
            console.error('Error response:', JSON.stringify(error.response, null, 2));
        }
    }
}

test();
