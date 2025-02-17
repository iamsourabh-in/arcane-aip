const crypto = require('crypto');
const BigInteger = require('big-integer');
const NodeRSA = require('node-rsa');

function prepareMessage(message, randomized = true) {
    if (!randomized) {
        // Identity preparation: Return the message as is
        return Buffer.from(message);
    }
    // Randomized preparation: Add randomness to the message
    const random = crypto.randomBytes(32); // Generate a secure random value
    return Buffer.concat([random, Buffer.from(message)]);
}

function blindMessage(preparedMessage, publicKey) {
    const key = new NodeRSA(publicKey, 'pkcs1-public-pem');
    const n = BigInteger(key.keyPair.n.toString());
    const e = BigInteger(key.keyPair.e.toString());

    // Generate a random blinding factor
    const r = BigInteger(crypto.randomBytes(32).toString('hex'), 16).mod(n);

    // Compute blinded message: (m * r^e) mod n
    const m = BigInteger(preparedMessage.toString('hex'), 16);
    const blinded = m.multiply(r.modPow(e, n)).mod(n);

    return { blinded: blinded.toString(16), r, n };
}

function signBlindedMessage(blindedMessage, privateKey) {
    const key = new NodeRSA(privateKey, 'pkcs1-private-pem');
    const d = BigInteger(key.keyPair.d.toString());
    const n = BigInteger(key.keyPair.n.toString());

    // Sign the blinded message: (blindedMessage^d) mod n
    const blindSignature = BigInteger(blindedMessage, 16).modPow(d, n);
    return blindSignature.toString(16);
}

function finalizeSignature(blindSignature, r, n, publicKey) {
    // Unblind the signature: blindSignature / r mod n
    const unblindedSignature = BigInteger(blindSignature, 16).multiply(r.modInv(n)).mod(n);

    // Verify the unblinded signature
    const key = new NodeRSA(publicKey, 'pkcs1-public-pem');
    const e = BigInteger(key.keyPair.e.toString());
    const mRecovered = unblindedSignature.modPow(e, n);

    return { unblindedSignature: unblindedSignature.toString(16), mRecovered: mRecovered.toString(16) };
}

function verifySignature(message, signature, publicKey) {
    const key = new NodeRSA(publicKey, 'pkcs1-public-pem');
    const n = BigInteger(key.keyPair.n.toString());
    const e = BigInteger(key.keyPair.e.toString());

    // Recover the message from the signature
    const mRecovered = BigInteger(signature, 16).modPow(e, n);

    // Compare with the original message
    const originalMessage = BigInteger(message.toString('hex'), 16);
    return mRecovered.equals(originalMessage);
}

// Generate keys (you can also use pre-existing keys)
const serverKey = new NodeRSA({ b: 2048 });
const publicKey = serverKey.exportKey('pkcs1-public-pem');
const privateKey = serverKey.exportKey('pkcs1-private-pem');

// Step 1: Prepare
const message = "This is a secret message";

const preparedMessage = prepareMessage(message, true);
console.log("Prepared Message:", preparedMessage.toString());


const messageHash = crypto.createHash('sha256').update(message).digest('hex');
console.log("messageHash:", messageHash.toString());

// Step 2: Blind
const { blinded, r, n } = blindMessage(preparedMessage, publicKey);
console.log("blinded Message:", blinded.toString());
// Step 3: BlindSign (Server-side operation)
const blindSignature = signBlindedMessage(blinded, privateKey);
console.log("blindSignature:", blindSignature.toString());
// Step 4: Finalize
const { unblindedSignature } = finalizeSignature(blindSignature, r, n, publicKey);
console.log("unblindedSignature:", unblindedSignature.toString());
// Step 5: Verify
const isVerified = verifySignature(preparedMessage, unblindedSignature, publicKey);
console.log("Is the signature verified?", isVerified);
