const express = require('express');
const bodyParser = require('body-parser');
const NodeRSA = require('node-rsa');
const crypto = require('crypto');

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
app.post('/process-data', (req, res) => {
    console.log(`Node-LLM Service: Received request for ${req.url}`);
    const { encryptedData, iv, authTag, wrappedDEK, ott } = req.body;

    // Unwrap the DEK
    const dek = unwrapDEK(wrappedDEK, privateKey);

    // Decrypt the data
    const decryptedData = decryptData(encryptedData, dek, iv, authTag);
    console.log('Decrypted data:', decryptedData);

    // Return the processed data
    res.json({ message: 'Data processed successfully', decryptedData });
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

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
    console.log(`Node-LLM Service is running on port ${PORT}`);
});
