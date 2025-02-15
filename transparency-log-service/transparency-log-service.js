const express = require('express');
const crypto = require('crypto');

class TransparencyLogService {
    constructor() {
        this.log = [];
    }

    // Add a new entry to the log
    addEntry(entry) {
        const timestamp = new Date().toISOString();
        const hash = crypto.createHash('sha256').update(entry + timestamp).digest('hex');
        const logEntry = {
            timestamp,
            entry,
            hash
        };
        this.log.push(logEntry);
        return logEntry;
    }

    // Retrieve all log entries
    getEntries() {
        return this.log;
    }

    // Verify if an entry exists in the log
    verifyEntry(entry) {
        return this.log.some(logEntry => logEntry.entry === entry);
    }
}

const app = express();
const transparencyLogService = new TransparencyLogService();

app.use(express.json());

// Endpoint to add a new entry
app.post('/add-entry', (req, res) => {
    const { entry } = req.body;
    if (!entry) {
        return res.status(400).send('Entry is required');
    }
    const logEntry = transparencyLogService.addEntry(entry);
    res.status(201).send(logEntry);
});

// Endpoint to get all entries
app.get('/entries', (req, res) => {
    res.send(transparencyLogService.getEntries());
});

// Endpoint to verify an entry
app.post('/verify-entry', (req, res) => {
    const { entry } = req.body;
    if (!entry) {
        return res.status(400).send('Entry is required');
    }
    const exists = transparencyLogService.verifyEntry(entry);
    res.send({ exists });
});

const PORT = 5006;
app.listen(PORT, () => {
    console.log(`Transparency Log Service running on port ${PORT}`);
});
