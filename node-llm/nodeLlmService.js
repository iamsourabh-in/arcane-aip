import express from 'express';
import bodyParser from 'body-parser';
import NodeRSA from 'node-rsa';
import crypto from 'crypto';
import ollama from 'ollama';



const app = express();
app.use(bodyParser.json());

// Generate RSA keys for the Node-LLM Service
const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

// Endpoint to expose the public key
app.get('/public-key', (req, res) => {
    res.json({ publicKey });
});

// Endpoint to process data received by the LLM
app.post('/process-data', async (req, res) => {
    console.log(`Node-LLM Service: Received request for ${req.url}`);
    const { encryptedData, iv, authTag, wrappedDEK, ott } = req.body;

    // Unwrap the DEK
    const dek = unwrapDEK(wrappedDEK, privateKey);

    // Decrypt the data
    const decryptedData = decryptData(encryptedData, dek, iv, authTag);
    console.log('Decrypted data:', decryptedData);


    const responseData = await processWithOllama(decryptedData);

    const { encryptedData: encryptedResponse, iv: responseIv, authTag: responseAuthTag } = encryptData(responseData, dek);
    // Return the processed data
    res.json({
        encryptedData: encryptedResponse,
        iv: responseIv,
        authTag: responseAuthTag
    });
});


// Function to unwrap the DEK using the gateway's private key
function unwrapDEK(wrappedDEK, privateKey) {
    const key = new NodeRSA(privateKey);
    return key.decrypt(wrappedDEK, 'buffer');
}

// Function to decrypt data using AES-GCM
function decryptData(encryptedData, dek, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
// Function to encrypt data using AES-GCM
function encryptData(data, dek) {
    const iv = crypto.randomBytes(12); // 96-bit IV
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return { encryptedData: encrypted, iv: iv.toString('base64'), authTag };
}


// New method to interact with the Ollama API
async function processWithOllama(decryptedData) {
    try {
        const response = await ollama.chat({
          model: 'llama3.2:1b',
          messages: [{ role: 'user', content: decryptedData }],
        })
        return response.message.content;

        // const ollama = new Ollama();
        // await ollama.setModel("llama3.2:1b");
        // var reponse =  await ollama.generate(decryptedData);
        // return reponse;

    } catch (error) {
        console.error('Error interacting with Ollama API:', error);
        throw error;
    }
}

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
    console.log(`Node-LLM Service is running on port ${PORT}`);
});
