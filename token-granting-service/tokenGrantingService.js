import express from 'express';
import bodyParser from 'body-parser';
import { getIdentityServicePublicKey, issueOTTs } from './services.js';
import { publicKey } from './rsaKeys.js';
import blindSignatures from 'blind-signatures';

const app = express();
app.use(bodyParser.json());

// Endpoint to get the public key
app.get('/public-key', (req, res) => {
    res.json({ publicKey });
});

// Endpoint to issue OTTs
app.post('/issue-ott', async (req, res) => {
    const { tgt } = req.body;

    try {

        const identityPublicKey = await getIdentityServicePublicKey();

        const decryptedTGT = identityPublicKey.decryptPublic(tgt, 'utf8');
        console.log(`Validated TGT for device: ${decryptedTGT}`);

        const otts = issueOTTs(decryptedTGT);

        res.json({ otts });
    } catch (error) {
        return res.status(403).json({ error: 'Invalid TGT' });
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Token Granting Service is running on port ${PORT}`);
});
