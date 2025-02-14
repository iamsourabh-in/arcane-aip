const express = require('express');
const bodyParser = require('body-parser');
const NodeRSA = require('node-rsa');

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
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    // Simulate processing the data
    const processedData = `Processed data: ${data}`;
    console.log('Processing data:', data);

    // Return the processed data
    res.json({ processedData });
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
    console.log(`Node-LLM Service is running on port ${PORT}`);
});
