const axios = require('axios');
const NodeRSA = require('node-rsa');
const crypto = require('crypto');

let gatewayPublicKey = '';
async function getTokens(deviceId) {
    try {
        // Request a TGT from the Identity Service
        const tgtResponse = await axios.post('http://localhost:5001/issue-tgt', { deviceId });
        const tgt = tgtResponse.data.tgt;

        // Request OTTs from the Token Granting Service using the TGT
        const ottResponse = await axios.post('http://localhost:5002/issue-ott', { tgt });
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

// Function to encrypt data using AES-GCM
function encryptData(data, dek) {
    const iv = crypto.randomBytes(12); // 96-bit IV
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



async function sendRequestToRelay(ott) {
    try {
        // Generate a unique DEK for the request
        const dek = generateDEK();

        // Encrypt the request data using the DEK
        const requestData = 'Sensitive data to be processed';
        const { encryptedData, iv, authTag } = encryptData(requestData, dek);

        // Wrap the DEK using HPKE (simulated with RSA)
        const wrappedDEK = wrapDEK(dek, gatewayPublicKey);

        // Send the encrypted request and wrapped DEK to the relay service
        const response = await axios.post('http://localhost:5003/process-request', {
            encryptedData,
            iv,
            authTag,
            wrappedDEK,
            ott
        });
        console.log('Response from relay:', response.data);
    } catch (error) {
        console.error('Error sending request to relay:', error);
    }
}

async function main() {
    const deviceId = 'device123';
    const otts = await getTokens(deviceId);

    if (otts && otts.length > 0) {
        // Use the first OTT to send a request
        await sendRequestToRelay(otts[0]);
    }
}


// Function to fetch the updated public key from the gateway
async function fetchGatewayPublicKeyViaRelay() {
    try {
        const response = await axios.get('http://localhost:5003/public-key');
        gatewayPublicKey = response.data.publicKey;
        console.log('Updated gateway public key:', gatewayPublicKey);
    } catch (error) {
        console.error('Error fetching gateway public key:', error);
    }
}

// Fetch the gateway public key every hour
fetchGatewayPublicKeyViaRelay(); // Initial fetch
setInterval(fetchGatewayPublicKeyViaRelay, 3600000); // 1 hour in milliseconds

main();
