const express = require('express');
const bodyParser = require('body-parser');
const NodeRSA = require('node-rsa');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Generate RSA keys for TGS
const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

// Function to fetch the Identity Service's public key
async function getIdentityServicePublicKey() {
    try {
        const response = await axios.get('http://localhost:5001/public-key');
        return response.data.publicKey;
    } catch (error) {
        console.error('Error fetching public key:', error);
        throw new Error('Could not fetch public key');
    }
}

// Endpoint to get the public key
app.get('/public-key', (req, res) => {
    res.json({ publicKey });
});


// Endpoint to issue OTTs
app.post('/issue-ott', async (req, res) => {
    const { tgt } = req.body;

    try {
        // Fetch the Identity Service's public key
        const identityPublicKey = await getIdentityServicePublicKey();
        const identityKey = new NodeRSA(identityPublicKey);

        // Validate TGT using the Identity Service's public key
        const decryptedTGT = identityKey.decryptPublic(tgt, 'utf8');
        console.log(`Validated TGT for device: ${decryptedTGT}`);

        // Issue OTTs using RSA Blind Signatures
        const otts = issueOTTs(decryptedTGT);

        res.json({ otts });
    } catch (error) {
        return res.status(403).json({ error: 'Invalid TGT' });
    }
});

// Function to issue OTTs
function issueOTTs(deviceId) {
    // Create a batch of OTTs (for simplicity, just encrypt the deviceId multiple times)
    const otts = Array.from({ length: 5 }, () => key.encryptPrivate(deviceId, 'base64'));
    return otts;
}

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Token Granting Service is running on port ${PORT}`);
});
