require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function list() {
    try {
        console.log('Listing models...');
        const pager = await ai.models.list();
        for await (const model of pager) {
            console.log(model.name);
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
}
list();
