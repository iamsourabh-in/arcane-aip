const express = require('express');
const httpProxy = require('http-proxy');

const app = express();
const proxy = httpProxy.createProxyServer();

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`Relay: Received request for ${req.url}`);
    // Remove the x-forwarded-for header to hide the original IP address
    req.headers['x-forwarded-for'] = '';
    next();
});

// Route to proxy requests for public keys
app.use('/public-key', (req, res) => {
    proxy.web(req, res, {
        target: 'http://localhost:5004/node-llm-public-key', // Assuming the gateway exposes the Node-LLM public key here
        selfHandleResponse: false
    }, (error) => {
        console.error('Proxy error for public key:', error);
        res.status(500).send('Proxy error for public key');
    });
});

// Route to proxy requests for processing
app.use('/process-request', (req, res) => {
    proxy.web(req, res, {
        target: 'http://localhost:5004/process-request',
        selfHandleResponse: false
    }, (error) => {
        console.error('Proxy error for process request:', error);
        res.status(500).send('Proxy error for process request');
    });
});

proxy.on('proxyReq', (proxyReq, req) => {
    // Remove the x-forwarded-for header to hide the original IP address
    if (req.body) {
        const bodyData = JSON.stringify(req.body);
        console.log("Relay:", req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Relay Service is running on port ${PORT}`);
});
