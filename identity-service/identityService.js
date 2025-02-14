const express = require('express');
const bodyParser = require('body-parser');
const NodeRSA = require('node-rsa');

const app = express();
app.use(bodyParser.json());

// Generate RSA keys
const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

app.get('/public-key', (req, res) => {
    res.json({ publicKey });
});

// Endpoint to issue TGT
app.post('/issue-tgt', (req, res) => {
    const { deviceId } = req.body;

    // Verify device eligibility (placeholder logic)
    if (!isDeviceEligible(deviceId)) {
        return res.status(403).json({ error: 'Device not eligible' });
    }

    // Issue TGT using RSA Blind Signatures
    const tgt = issueTGT(deviceId);

    res.json({ tgt });
});

// Function to verify device eligibility
function isDeviceEligible(deviceId) {
    // Placeholder logic for device eligibility
    return true; // Assume all devices are eligible for now
}


// Function to issue TGT
function issueTGT(deviceId) {
    // Create a TGT (for simplicity, just encrypt the deviceId)
    const tgt = key.encryptPrivate(deviceId, 'base64');
    return tgt;
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Identity Service is running on port ${PORT}`);
});
