import express from 'express';
import bodyParser from 'body-parser';
import NodeRSA from 'node-rsa';
import dotenv from 'dotenv';
import { unwrapDEK, decryptData, encryptData, generateAttestationBundle } from './helpers.js';
import { processWithGPT, processWithGemini, processWithOllama } from './models.js';

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Generate attestationBundle for the Node-LLM Service
let attestationBundle = {};

const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

// Endpoint to expose the public key
app.get('/public-key', (req, res) => {
    res.json(attestationBundle);
});

// Endpoint to process data received for inference
app.post('/process-data', async (req, res) => {
    console.log(`Node-LLM Service: Received request for ${req.url}`);
    const { encryptedData, iv, authTag, wrappedDEK, ott } = req.body;

    const dek = unwrapDEK(wrappedDEK, privateKey);

    const decryptedData = decryptData(encryptedData, dek, iv, authTag);
    console.log('Decrypted data:', decryptedData);
    var model_id = process.env.MODEL_ID
    let responseData = "";
    switch (model_id) {
        case "gpt":
            responseData = await processWithGPT(decryptedData);
            break;
        case "gemini":
            responseData = await processWithGemini(decryptedData);
            break;
        case "ollama":
        default:
            responseData = await processWithOllama(decryptedData);
            break;
    }

    const { encryptedData: encryptedResponse, iv: responseIv, authTag: responseAuthTag } = encryptData(responseData, dek);
    // Return the processed data
    res.json({
        encryptedData: encryptedResponse,
        iv: responseIv,
        authTag: responseAuthTag
    });
});



attestationBundle = generateAttestationBundle(publicKey);

// console.log(await processWithGemini("Hi"));

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
    console.log(`[Node-LLM Service] Attested service is running on port ${PORT},${JSON.stringify(attestationBundle)}`);
});
