import ollama from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function processWithGPT(decryptedData) {
    try {
        const prompt = decryptedData;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    }
    catch (err) {
        console.log(err);
        res.send("Unexpected Error!!!");
    }

}
export async function processWithGemini(decryptedData) {
    try {
        const prompt = decryptedData;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    }
    catch (err) {
        console.log(err);
        res.send("Unexpected Error!!!");
    }

}

// New method to interact with the Ollama API
export async function processWithOllama(decryptedData) {
    try {
        const response = await ollama.chat({
            model: 'llama3.2:1b',
            messages: [{ role: 'user', content: decryptedData }],
        })
        return response.message.content;

    } catch (error) {
        console.error('Error interacting with Ollama API:', error);
        throw error;
    }
}
