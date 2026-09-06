const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// TikTok Direct Downloader / Resolver Endpoint
app.get('/api/resolve', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) return res.status(400).json({ ok: false, error: 'URL parameter is required' });

        const response = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
        const textData = await response.text();

        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            return res.status(500).json({ ok: false, error: 'Upstream service error' });
        }

        if (data.code !== 0) {
            return res.status(400).json({ ok: false, error: data.msg || 'Failed to fetch TikTok media' });
        }

        res.json({ ok: true, item: data.data });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}
