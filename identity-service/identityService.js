const express = require('express');
const bodyParser = require('body-parser');
const blindSignatures = require('blind-signatures');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Generate RSA keys
const keyPair = blindSignatures.keyGeneration({ b: 512 });
const publicKey = keyPair.keyPair.n.toString(16);
const privateKey = keyPair.keyPair.d.toString(16);

app.get('/public-key', (req, res) => {
    console.log("Public Key:", publicKey);
    res.json({
        publicKey: {
            n: keyPair.keyPair.n.toString(16),
            e: keyPair.keyPair.e.toString(16)
        }
    });
});

// Endpoint to issue TGT
app.post('/issue-tgt', (req, res) => {
    console.log("Identity: Received Request for issue-tgt");
    const { blindedMessage } = req.body;
    // console.log("Identity: Blinded Message:", blindedMessage);
    // console.log("Identity: Blinded Message:", keyPair);
    // Verify device eligibility (placeholder logic)
    if (!isDeviceEligible(blindedMessage)) {
        return res.status(403).json({ error: 'Device not eligible' });
    }

    // Sign the blinded message
    const blindedSignature = blindSignatures.sign({
        blinded: blindedMessage,
        key: keyPair
    });

    res.json({ tgt: blindedSignature });
});

// Function to verify device eligibility
function isDeviceEligible(blindedMessage) {
    // Placeholder logic for device eligibility
    return true; // Assume all devices are eligible for now
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Identity Service is running on port ${PORT}`);
});
