// helpers.js
import NodeRSA from 'node-rsa';
import crypto from 'crypto';

// Function to unwrap the DEK using the gateway's private key
export function unwrapDEK(wrappedDEK, privateKey) {
    const key = new NodeRSA(privateKey);
    return key.decrypt(wrappedDEK, 'buffer');
}

// Function to decrypt data using AES-GCM
export function decryptData(encryptedData, dek, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Function to encrypt data using AES-GCM
export function encryptData(data, dek) {
    const iv = crypto.randomBytes(12); // 96-bit IV
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return { encryptedData: encrypted, iv: iv.toString('base64'), authTag };
}

export function generateAttestationBundle(publicKey) {
    // Sample data for the attestation bundle
    const sepAttestation = crypto.randomBytes(64); // Simulated DER-encoded SEP attestation
    const apTicket = crypto.randomBytes(64); // Simulated DER-encoded AP Image4 manifest

    // Sample SealedHashLedger
    const sealedHashLedger = {
        slots: {
            'slot1': {
                hash_alg: 1, // HASH_ALG_SHA256
                entries: [
                    {
                        flags: 0,
                        digest: crypto.randomBytes(32), // Simulated digest
                        info: {
                            cryptex: {
                                image4_manifest: crypto.randomBytes(64) // Simulated cryptex Image4 manifest
                            }
                        }
                    }
                ]
            }
        }
    };

    // Sample provisioning certificate chain
    const provisioningCertificateChain = [crypto.randomBytes(64), crypto.randomBytes(64)];

    // // Sample key expiration timestamp
    // const keyExpiration = new Timestamp();
    // keyExpiration.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)); // 1 year from now

    // Sample TransparencyProofs
    const transparencyProofs = {
        proofs: {
            // Simulated transparency proofs
        }
    };

    // Construct the attestation bundle
    return {
        sep_attestation: sepAttestation,
        ap_ticket: apTicket,
        sealed_hashes: sealedHashLedger,
        provisioning_certificate_chain: provisioningCertificateChain,
        key_expiration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
        transparency_proofs: transparencyProofs,
        public_key: publicKey
    };
}