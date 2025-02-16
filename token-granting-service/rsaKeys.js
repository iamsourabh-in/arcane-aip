import NodeRSA from 'node-rsa';

// Generate RSA keys for TGS
const key = new NodeRSA({ b: 512 });
export const publicKey = key.exportKey('public');
export const privateKey = key.exportKey('private');
