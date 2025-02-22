import axios from 'axios';
import crypto from 'crypto';
import blindSignatures from 'blind-signatures';
import NodeRSA from 'node-rsa';
import readline from 'readline';

// Configuration (use environment variables or a config file in production)
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
const TOKEN_GRANTING_SERVICE_URL = process.env.TOKEN_GRANTING_SERVICE_URL || 'http://localhost:5002';
const RELAY_SERVICE_URL = process.env.RELAY_SERVICE_URL || 'http://localhost:5003';

let nodeLlmPublicKey = '';
let identityPublicKey = '';

const getTGT = async (tgtRequest) => {
    try {
        const { blindedMessage, blindingFactor } = blindRequest(tgtRequest.deviceId, identityPublicKey);
        const blindedRequest = {
            blindedMessage,
            authcode: tgtRequest.authcode,
            password: tgtRequest.password,
        };
        const tgtResponse = await axios.post(`${IDENTITY_SERVICE_URL}/issue-tgt`, blindedRequest);
        const signedBlindedTGT = tgtResponse.data.tgt;
        return { signedBlindedTGT, blindingFactor };
    } catch (error) {
        throw new Error('Error obtaining TGT:', error);
    }
}

const getOTTs = async (signedBlindedTGT, blindingFactor) => {

    try {
        const tgt = unblindResponse(signedBlindedTGT, blindingFactor, identityPublicKey);
        const ottResponse = await axios.post(`${TOKEN_GRANTING_SERVICE_URL}/issue-ott`, { tgt });
        return ottResponse.data.otts;
    } catch (error) {
        throw new Error('Error obtaining TGT:', error);
    }
};

const chatLoop = async (ott) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('You: ');
    rl.prompt();

    rl.on('line', async (line) => {
        const dek = generateDEK();
        const { encryptedData, iv, authTag } = encryptData(line, dek);
        const wrappedDEK = wrapDEK(dek, nodeLlmPublicKey);

        try {
            const response = await axios.post(`${RELAY_SERVICE_URL}/process-request`, {
                encryptedData,
                iv,
                authTag,
                wrappedDEK,
                ott
            });

            const { encryptedData: encryptedResponse, iv: responseIv, authTag: responseAuthTag } = response.data;
            const decryptedResponse = decryptData(encryptedResponse, dek, responseIv, responseAuthTag);
            console.log('Node LLM:', decryptedResponse);
        } catch (error) {
            console.error('Error sending request to relay:', error);
        }

        rl.prompt();
    }).on('close', () => {
        console.log('Chat session ended.');
        process.exit(0);
    });
};

// Function to blind the request using RSA blinding
const blindRequest = (message, publicKey) => {
    if (!publicKey || !publicKey.n || !publicKey.e) {
        throw new Error('Invalid public key structure');
    }

    const messageHash = crypto.createHash('sha256').update(message).digest('hex');
    const { blinded, r } = blindSignatures.blind({
        message: messageHash,
        N: publicKey.n,
        E: publicKey.e
    });
    return { blindedMessage: blinded, blindingFactor: r };
};

// Function to unblind the signed response
const unblindResponse = (signedBlindedMessage, blindingFactor, publicKey) => {
    return blindSignatures.unblind({
        signed: signedBlindedMessage,
        N: publicKey.n,
        r: blindingFactor
    });
};

// Function to generate a unique Data Encryption Key (DEK)
const generateDEK = () => crypto.randomBytes(32); // 256-bit key

// Function to decrypt data using AES-GCM
const decryptData = (encryptedData, dek, iv, authTag) => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

// Function to encrypt data using AES-GCM
const encryptData = (data, dek) => {
    const iv = crypto.randomBytes(12); // 96-bit IV
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return { encryptedData: encrypted, iv: iv.toString('base64'), authTag };
};

// Function to wrap the DEK using HPKE (simulated with RSA for simplicity)
const wrapDEK = (dek, publicKey) => {
    const key = new NodeRSA(publicKey);
    return key.encrypt(dek, 'base64');
};

const main = async () => { 
    const tgtRequest = { deviceId: 'device1', authcode: '123456', password: 'password123' };
    console.log('Blinded TGT:', tgtRequest);
    try {
        let { signedBlindedTGT, blindingFactor } = await getTGT(tgtRequest);
        console.log('Signed Blinded TGT:', signedBlindedTGT);
        const otts = await getOTTs(signedBlindedTGT, blindingFactor);
        console.log('Received OTTs:', otts);
        if (otts && otts.length > 0) {
            await chatLoop(otts[0]);
        }
    } catch (error) {
        console.error('Error in the main flow:', error.message);
    }
};

// #region Fetch Public Keys functions
const fetchIdentityPublicKey = async () => {
    try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/public-key`);
        const { n, e } = response.data.publicKey;

        if (!n || !e) {
            throw new Error('Invalid public key structure');
        }

        identityPublicKey = {
            n: n.toString(),
            e: e.toString()
        };

        console.log('Updated identity public key:', identityPublicKey);
    } catch (error) {
        console.error('Error fetching identity public key:', error);
    }
};

const fetchGatewayPublicKeyViaRelay = async () => {
    try {
        const response = await axios.get(`${RELAY_SERVICE_URL}/public-key`);
        nodeLlmPublicKey = response.data.publicKey;
        console.log('Fetched gateway public key:', nodeLlmPublicKey);
    } catch (error) {
        console.error('Error fetching gateway public key:', error);
    }
};
await fetchIdentityPublicKey();
await fetchGatewayPublicKeyViaRelay(); // Initial fetch
setInterval(fetchGatewayPublicKeyViaRelay, 3600000); // 1 hour in milliseconds
// #endregion

main();
