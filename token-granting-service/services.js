import axios from 'axios';
import NodeRSA from 'node-rsa';
import { privateKey } from './rsaKeys.js';

// Function to fetch the Identity Service's public key
export const getIdentityServicePublicKey = async () => {
    try {
        const response = await axios.get('http://localhost:5001/public-key');
        return new NodeRSA(response.data.publicKey);
    } catch (error) {
        console.error('Error fetching public key:', error);
        throw new Error('Could not fetch public key');
    }
};

// Function to issue OTTs
export const issueOTTs = (deviceId) => {
    // Create a batch of OTTs (for simplicity, just encrypt the deviceId multiple times)
    const key = new NodeRSA(privateKey);
    return Array.from({ length: 5 }, () => key.encryptPrivate(deviceId, 'base64'));
};
