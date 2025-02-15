const axios = require('axios');
const crypto = require('crypto');
const blindSignatures = require('blind-signatures');
const NodeRSA = require('node-rsa');
const readline = require('readline');

// Configuration (use environment variables or a config file in production)
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
const TOKEN_GRANTING_SERVICE_URL = process.env.TOKEN_GRANTING_SERVICE_URL || 'http://localhost:5002';
const RELAY_SERVICE_URL = process.env.RELAY_SERVICE_URL || 'http://localhost:5003';

let gatewayPublicKey = '';
let identityPublicKey = '';

// Function to blind the request using RSA blinding
function blindRequest(message, publicKey) {
    console.log('Public Key:', publicKey); // Debugging line to check public key structure

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
}

// Function to unblind the signed response
function unblindResponse(signedBlindedMessage, blindingFactor, publicKey) {
    const unblinded = blindSignatures.unblind({
        signed: signedBlindedMessage,
        N: publicKey.n,
        r: blindingFactor
    });
    return unblinded;
}

async function getTokens(authRequest) {
    await fetchIdentityPublicKey();
    console.log('Obtaining tokens using identity public key:', identityPublicKey);
    try {
        const { blindedMessage, blindingFactor } = blindRequest(authRequest.deviceId, identityPublicKey);

        const blindedRequest = {
            blindedMessage,
            authcode: authRequest.authcode,
            password: authRequest.password,
        };
        // Request a TGT from the Identity Service
        const tgtResponse = await axios.post(`${IDENTITY_SERVICE_URL}/issue-tgt`, blindedRequest);
        const signedBlindedTGT = tgtResponse.data.tgt;

        // Unblind the TGT
        const tgt = unblindResponse(signedBlindedTGT, blindingFactor, identityPublicKey);

        // Request OTTs from the Token Granting Service using the TGT
        const ottResponse = await axios.post(`${TOKEN_GRANTING_SERVICE_URL}/issue-ott`, { tgt });
        const otts = ottResponse.data.otts;

        console.log('Obtained OTTs:', otts);
        return otts;
    } catch (error) {
        console.error('Error obtaining tokens:', error);
    }
}

// Function to generate a unique Data Encryption Key (DEK)
function generateDEK() {
    return crypto.randomBytes(32); // 256-bit key
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
    const iv = crypto.randomBytes(32); // 96-bit IV
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return { encryptedData: encrypted, iv: iv.toString('base64'), authTag };
}

// Function to wrap the DEK using HPKE (simulated with RSA for simplicity)
function wrapDEK(dek, publicKey) {
    const key = new NodeRSA(publicKey);
    return key.encrypt(dek, 'base64');
}

async function chatLoop(ott) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('You: ');
    rl.prompt();

    rl.on('line', async (line) => {
        const dek = generateDEK();
        const { encryptedData, iv, authTag } = encryptData(line, dek);
        const wrappedDEK = wrapDEK(dek, gatewayPublicKey);

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
}


async function main() {
    const authRequest = { deviceId: 'device1', authcode: '123456', password: 'password123' };

    try {
        const otts = await getTokens(authRequest);

        if (otts && otts.length > 0) {
            await chatLoop(otts[0]);

        }
    } catch (error) {
        console.error('Error in the main flow:', error.message);
    }
}

// #region Fetch Public Keys functions
// Function to fetch the updated public key from the identity service
async function fetchIdentityPublicKey() {
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
}

// Function to fetch the updated public key from the gateway
async function fetchGatewayPublicKeyViaRelay() {
    try {
        const response = await axios.get(`${RELAY_SERVICE_URL}/public-key`);
        gatewayPublicKey = response.data.publicKey;
        console.log('Fetched gateway public key:', gatewayPublicKey);
    } catch (error) {
        console.error('Error fetching gateway public key:', error);
    }
}

// Fetch the gateway public key every hour
fetchGatewayPublicKeyViaRelay(); // Initial fetch
setInterval(fetchGatewayPublicKeyViaRelay, 3600000); // 1 hour in milliseconds
// #endregion

main();
