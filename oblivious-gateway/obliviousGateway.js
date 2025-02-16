const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const NodeRSA = require('node-rsa');

const app = express();
app.use(bodyParser.json());

// Generate RSA keys for the Oblivious Gateway
const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

let nodeLlmPublicKey = '';
let TGTPublicKey = '';

// Function to fetch the public key from the Node-LLM service
async function fetchNodeLlmPublicKey() {
    try {
        const response = await axios.get('http://localhost:5005/public-key');
        nodeLlmPublicKey = response.data.public_key;
        console.log('[Gateway] Fetched Node-LLM public key:', nodeLlmPublicKey);
    } catch (error) {
        console.error('[Gateway] Error fetching Node-LLM public key:', error);
    }
}
async function fetchTGSPublicKey() {
    try {
        const response = await axios.get('http://localhost:5002/public-key');
        TGTPublicKey = response.data.publicKey;
        console.log('[Gateway] Fetched TGS public key:', nodeLlmPublicKey);
    } catch (error) {
        console.error('Error fetching TGS public key:', error);
    }
}



// Endpoint to expose the gateway's public key
app.get('/public-key', (req, res) => {
    res.json({ publicKey: nodeLlmPublicKey });
});

// Endpoint to expose the Node-LLM public key
app.get('/node-llm-public-key', (req, res) => {
    if (!nodeLlmPublicKey) {
        return res.status(500).json({ error: 'Node-LLM public key not available' });
    }
    res.json({ publicKey: nodeLlmPublicKey });
});

// Function to verify the OTT
function verifyOTT(ott) {
    try {
        console.log("Verifying OTT", TGTPublicKey);
        const TGTKey = new NodeRSA(TGTPublicKey);
        // Decrypt the OTT using the TGS's public key
        const decryptedOTT = TGTKey.decryptPublic(ott, 'utf8');
        console.log('Verified OTT:', decryptedOTT);
        return true;
    } catch (error) {
        console.error('OTT verification failed:', error);
        return false;
    }
}

// Endpoint to handle encrypted requests
app.post('/process-request', async (req, res) => {
    console.log(`Gateway: Received request for ${req.url}`);
    const { encryptedData, ott } = req.body;

    // Verify the OTT
    // if (!verifyOTT(ott)) {
    //     return res.status(403).json({ error: 'Invalid OTT' });
    // }

    try {
        const reponse = await axios.post('http://localhost:5005/process-data', req.body);
        console.log(`Received response from Node-LLM:`, reponse.data);
        // Process the request and send a response
        res.json(reponse.data);
    } catch (error) {
        res.status(400).json({ error: 'Invalid encrypted data' });
    }
});

fetchNodeLlmPublicKey();
fetchTGSPublicKey();
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
    console.log(`Oblivious Gateway is running on port ${PORT}`);
});
