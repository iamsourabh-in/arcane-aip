# arcane-aip

I have a name for a project project arcane-aip, I want to build it about this project.

Arcane-AIP is a Node.js based AI platform designed to provide advanced artificial intelligence capabilities within iOS applications. Leveraging the power of machine learning models, Arcane-AIP enables developers to incorporate intelligent features into their apps seamlessly. With support for various languages and frameworks like MetalML and CloudKit, Arcane-AIP offers flexibility and scalability for building sophisticated AI-powered solutions.

# TechStack:
Node Programming Language
TypeScript
Vs Code IDE
Light ML Model(like ollama or hugging face)

The request flow in Private Cloud Compute (PCC) involves multiple steps, from the user’s device to the PCC node and back. Here is a step-by-step description of the process: 

1. Intelligence Orchestration: 
• The process begins when a user invokes an Mobile Intelligence feature, which triggers the modelmanagerd daemon on the user’s device. 
• The orchestration layer determines whether to route the request to an on-device or server-based model. 
• If a server-based model is needed, the request is passed to the privatecloudcomputed daemon, which handles the communication with PCC. 
• The system may initiate a prewarming step to ensure the device is ready for intelligence requests, including prefetching attestations. 

2. Client Authentication: 
• The user’s device authenticates with the PCC Identity Service to obtain a Token Granting Token (TGT). 
◦ The PCC Identity Service verifies that the device and user are eligible to use PCC and issues the TGT using RSA Blind Signatures. 
◦ This TGT is cryptographically unlinkable to the authentication information, ensuring anonymity. 
• The client sends the TGT to the Token Granting Service (TGS), along with a request for One-Time Tokens (OTTs). 
◦ The TGS checks the validity of the TGT and may request updated fraud data from the client. 
◦ If fraud data is required, the client gets updated data from the Fraud Detection Service (FDS) using blind signatures. ◦ The TGS returns a batch of OTTs after applying rate limits. • For each request to PCC, the client includes an OTT as proof of authorization. 
◦ The OTT is also built using RSA Blind Signatures, making it unlinkable to the batch request. 
◦ The PCC service verifies the OTT using its public key without learning any identifying information about the user or device. 

3. Network Transport: 
• All requests to PCC are routed through a third-party relay to conceal the source IP addresses. 
◦ The client encrypts the request using Hybrid Public Key Encryption (HPKE) and the public key of Apple’s Oblivious Gateway (OG). ◦ The client randomly selects an Oblivious Relay (OR) operated by third parties (e.g., Cloudflare, Fastly). 
◦ The OR acts as a secure HTTP proxy, and the client communicates with it via HTTP/3 or HTTP/2. 
◦ The client uses Publicly-Verifiable RSA Blind Signature Privacy Pass tokens to authenticate to both the OR and OG. • The keys used for Oblivious HTTP, TGT and OTT are published to a transparency log to mitigate targeting concerns. 

4. Attestation Prefetching: 
• Before submitting a request, the user’s device can prefetch attestations from the PCC Gateway using Oblivious HTTP. 
◦ These attestations are for a set of PCC nodes eligible to serve requests. 
◦ Prefetching avoids an extra network round trip before inference begins. 
◦ To mitigate fingerprinting, each prefetched attestation is used only once. 

5. Request Submission: 
• The client generates a unique Data Encryption Key (DEK) for each request and encrypts the request payload. 
• The client submits the request to the PCC Gateway. 
◦ If prefetched and validated node attestations are available, the client provides the symmetric keys wrapped to those nodes. 
◦ Otherwise, the PCC Gateway provides attestations for a set of candidate nodes. 
• The client verifies each attestation provided by the PCC Gateway using the CloudAttestation framework. 
◦ The framework checks the authenticity and integrity of the attestation. 
◦ It also validates that the attesting DCIK public key matches the public key of the provisioning certificate. 
◦ The framework evaluates a security policy to assert security properties including hardware and software measurements. ◦ The client validates the attestation to verify that the nodes are candidates to handle the request. 
• For each node with a validated attestation, the client wraps the DEK using HPKE, with the recipient key as the Request Encryption Key (REK) of the node, and a unique ephemeral sender key. 
• The client sends the HPKE-wrapped DEK to the PCC Gateway via the same connection. 


6. Node Selection: 
• The PCC Gateway selects an appropriate node to handle the request. 
◦ If prefetched attestations are available, the gateway routes the request to one of those nodes. 
◦ Otherwise, the gateway selects candidate nodes and returns their attestations to the client. 
◦ The PCC Gateway uses an algorithm that considers the current service state to pick nodes likely to be free when the request is ready to be processed. 
◦ The PCC Gateway then notifies the client of the selected node. • The PCC Gateway forwards the node-specific wrapped DEK, along with the encrypted request, to the selected node. 

7. Request Processing on the PCC Node which runs the LLM model: 
• The request is received by the cloudboardd daemon, which manages interactions with the PCC Gateway. 
• cloudboardd creates a new instance of cb_jobhelper to manage the request. 
• The cb_jobhelper performs the cryptographic handshake with the client device and decrypts the streamed request messages using the attested SEP-backed REK. 
• The cb_jobhelper extracts the client’s TGT from the request, verifies its signature, and checks that the OTT was derived from the TGT. 
• The request is then passed to a paired application instance, such as tie-cloud-app. 
• The tie-cloud-app deserializes the request, validates parameters, and tokenizes the prompt using the model cryptex. 
• The tie-cloud-app sends the request to a shared tie-inference process that performs inference using a LLM model running. 
• The model output is streamed to the user’s device as tokens are produced. 
• The node uses the HPKE envelope to generate a key for response data, and encrypts its response. 
• The response is sent back to the client, routed via the PCC Gateway. 
• The response is encrypted using the HPKE-derived key established with the client. • The node deletes data associated with the request upon completion. 



8. Distributed Inference (if applicable): 
• For distributed inference, the request is processed across multiple nodes (an ensemble). 
◦ The nodes are connected via a high-performance interconnect using USB4. 
◦ The ensemble has a leader node that coordinates the work, and the other nodes are follower nodes. 
◦ The leader node is the only node that is exposed to client devices and capable of receiving incoming inference requests. ◦ The leader node splits the prompt tokens among all nodes to produce the first output token. 
• The AppleCIOMesh framework provides primitives for data distribution, such as peer-to-peer, gather-to-all, and broadcast messages. 
◦ Data on the transport is encrypted by AppleCIOMesh with AES-GCM 128 using a unique symmetric key for each node. 
• The ensemble nodes mutually authenticate each other and negotiate a shared secret to encrypt user data in transit. 
◦ The leader ensures each follower has a valid attestation, and all nodes have identical software measurements and hardware configurations. 


9. Response to Client: 
• The client receives the encrypted response from the PCC node. 
• The client is able to decrypt the response using the HPKE-derived key, because it knows which node sent the response. This detailed flow highlights the security and privacy measures taken at each step, including encryption, attestation, and the use of ephemeral keys..