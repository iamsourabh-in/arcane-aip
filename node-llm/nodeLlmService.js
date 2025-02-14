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
    const { encryptedData, wrappedDEK, iv, authTag, ott } = req.body;
    const DEK = key.decrypt(wrappedDEK, 'base64');
    console.log(DEK);

    const data = decryptData(encryptedData, DEK, iv, authTag);
    console.log(data);

    // if (!data) {
    //     return res.status(400).json({ error: 'No data provided' });
    // }

    // // Simulate processing the data
    // const processedData = `Processed data: ${data}`;
    // console.log('Processing data:', data);

    // Return the processed data
    res.json({ message: 'Data processed successfully' });
});


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
