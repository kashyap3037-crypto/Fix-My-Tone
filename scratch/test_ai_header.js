require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        console.log('Attempting to generate content with manual header...');
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', 
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
            config: {
                httpOptions: {
                    headers: {
                        'x-goog-api-key': process.env.GEMINI_API_KEY
                    }
                }
            }
        });
        
        console.log('Success!');
        console.log('Result:', response.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error details:', error);
    }
}

test();
