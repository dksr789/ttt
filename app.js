const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'https://fintechlearner.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy route to Freepik API
app.get('/api/resources/:resourceId/download', async (req, res) => {
    const { resourceId } = req.params;

    try {
        const response = await axios.get(`https://api.freepik.com/v1/resources/${resourceId}/download`, {
            headers: { 'x-freepik-api-key': process.env.key }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).send('Error fetching data from Freepik API');
    }
});

// Serve script.js
app.get('/js/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
