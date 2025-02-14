
# Summary 

The request flow in Private Cloud Compute (PCC) involves several steps to ensure secure and efficient processing of user requests. It begins with Intelligence Orchestration, where a user invokes a Mobile Intelligence feature, triggering the modelmanagerd daemon on the device. The orchestration layer decides whether to use an on-device or server-based model. If a server-based model is needed, the request is passed to the privatecloudcomputed daemon, which communicates with PCC. The system may also prewarm the device for intelligence requests by prefetching attestations.

Next, during Client Authentication, the user’s device authenticates with the PCC Identity Service to obtain a Token Granting Token (TGT). The PCC Identity Service verifies the device and user eligibility and issues the TGT using RSA Blind Signatures, ensuring anonymity. The client then sends the TGT to the Token Granting Service (TGS) to request One-Time Tokens (OTTs). The TGS validates the TGT and may request updated fraud data from the client. Once validated, the TGS returns a batch of OTTs, which the client includes in each request to PCC as proof of authorization.

In the Network Transport step, all requests to PCC are routed through a third-party relay to conceal the source IP addresses. The client encrypts the request using Hybrid Public Key Encryption (HPKE) and the public key of Apple’s Oblivious Gateway (OG). The client selects an Oblivious Relay (OR) operated by third parties, which acts as a secure HTTP proxy. The client uses Publicly-Verifiable RSA Blind Signature Privacy Pass tokens to authenticate to both the OR and OG. The keys used for Oblivious HTTP, TGT, and OTT are published to a transparency log to mitigate targeting concerns.

Attestation Prefetching allows the user’s device to prefetch attestations from the PCC Gateway using Oblivious HTTP before submitting a request. These attestations are for a set of PCC nodes eligible to serve requests, avoiding an extra network round trip before inference begins. Each prefetched attestation is used only once to mitigate fingerprinting.

During Request Submission, the client generates a unique Data Encryption Key (DEK) for each request and encrypts the request payload. The client submits the request to the PCC Gateway, providing symmetric keys wrapped to validated nodes if available. The PCC Gateway provides attestations for candidate nodes if prefetched attestations are not available. The client verifies each attestation using the CloudAttestation framework, ensuring the nodes are candidates to handle the request. The client wraps the DEK using HPKE and sends it to the PCC Gateway.

In Node Selection, the PCC Gateway selects an appropriate node to handle the request, considering the current service state. The gateway forwards the node-specific wrapped DEK and the encrypted request to the selected node. The request is processed on the PCC Node, where the cloudboardd daemon manages interactions with the PCC Gateway. The cb_jobhelper instance manages the request, performing cryptographic handshakes and decrypting the request. The request is passed to a paired application instance, which processes the request using a LLM model. The response is encrypted and sent back to the client via the PCC Gateway.

For Distributed Inference, the request is processed across multiple nodes connected via a high-performance interconnect. A leader node coordinates the work, and follower nodes assist in processing. The AppleCIOMesh framework provides data distribution primitives, and data is encrypted using AES-GCM 128. The nodes mutually authenticate and negotiate a shared secret to encrypt user data in transit.

Finally, the client receives the encrypted response from the PCC node and decrypts it using the HPKE-derived key. This detailed flow highlights the security and privacy measures taken at each step, including encryption, attestation, and the use of ephemeral keys.

iamsourabh-in: @workspace /explain Can you explain the encryption methods?

Workspace: Certainly! The README.md describes several encryption methods used in the Private Cloud Compute (PCC) request flow to ensure security and privacy. Here are the key encryption methods mentioned:

### 1. RSA Blind Signatures
- **Purpose**: Used for issuing Token Granting Tokens (TGTs) and One-Time Tokens (OTTs) to ensure anonymity.
- **How it works**: The PCC Identity Service uses RSA Blind Signatures to sign tokens without knowing their content, making the tokens unlinkable to the authentication information.

### 2. Hybrid Public Key Encryption (HPKE)
- **Purpose**: Used to encrypt requests and responses between the client and PCC nodes.
- **How it works**: HPKE combines asymmetric and symmetric encryption. The client encrypts the request using the public key of the recipient (e.g., Apple’s Oblivious Gateway or PCC nodes). The recipient uses its private key to decrypt the symmetric key, which is then used to decrypt the actual message.

### 3. AES-GCM 128
- **Purpose**: Used by the AppleCIOMesh framework for encrypting data on the transport layer during distributed inference.
- **How it works**: AES-GCM (Advanced Encryption Standard in Galois/Counter Mode) is a symmetric encryption algorithm that provides both confidentiality and data integrity. Each node uses a unique symmetric key for encryption.

### 4. Publicly-Verifiable RSA Blind Signature Privacy Pass Tokens
- **Purpose**: Used for authenticating to Oblivious Relays (OR) and Oblivious Gateways (OG).
- **How it works**: These tokens are signed using RSA Blind Signatures and can be verified publicly without revealing the user's identity.

### 5. Data Encryption Key (DEK)
- **Purpose**: Used to encrypt the request payload.
- **How it works**: The client generates a unique DEK for each request. This key is then wrapped using HPKE with the recipient's public key and sent along with the encrypted request.

### 6. Request Encryption Key (REK)
- **Purpose**: Used by PCC nodes to decrypt the request payload.
- **How it works**: The REK is derived from the attested SEP-backed key and used to decrypt the streamed request messages.

### 7. Ephemeral Keys
- **Purpose**: Used to enhance security by ensuring that keys are short-lived and unique for each session.
- **How it works**: Ephemeral keys are generated for each session or request, ensuring that even if one key is compromised, it does not affect other sessions.

### Summary
These encryption methods collectively ensure that:
- Requests and responses are securely encrypted.
- User anonymity is maintained.
- Data integrity and confidentiality are preserved.
- Keys are managed in a way that minimizes the risk of exposure.

If you have any specific questions about any of these methods or need further details, feel free to ask!