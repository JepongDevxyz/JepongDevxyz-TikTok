const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const BASE_URL = 'https://tikxedd.vercel.app';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 1. Resolve TikTok URL Endpoint
app.get('/api/resolve', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const endpoint = `${BASE_URL}/api/resolve?url=${encodeURIComponent(url)}`;
        const response = await fetch(endpoint);

        if (!response.ok) {
            return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// 2. Feed Endpoint
app.get('/api/feed', async (req, res) => {
    try {
        const { mode = 'trending', q = '', cursor = '0' } = req.query;
        const params = new URLSearchParams({ mode, q, cursor: String(cursor) });
        const endpoint = `${BASE_URL}/api/feed?${params}`;

        const response = await fetch(endpoint);

        if (!response.ok) {
            return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
