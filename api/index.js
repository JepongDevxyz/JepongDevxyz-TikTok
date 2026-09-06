const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// TikTok Direct Resolver Endpoint
app.get('/api/resolve', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) return res.status(400).json({ ok: false, error: 'URL parameter is required' });

        const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.code !== 0) {
            return res.status(400).json({ ok: false, error: data.msg || 'Failed to fetch TikXedd media' });
        }

        res.json({ ok: true, item: data.data });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// TikXedd Multi-Mode Feed & Search Endpoint
app.get('/api/feed', async (req, res) => {
    try {
        const { mode = 'trending', q = '', cursor = 0 } = req.query;
        let apiUrl = '';

        if (mode === 'trending') {
            apiUrl = `https://tikwm.com/api/feed/list?region=US&count=12`;
        } else if (mode === 'music') {
            apiUrl = `https://tikwm.com/api/music/posts?url=${encodeURIComponent(q)}&cursor=${cursor}`;
        } else {
            // Standard search & photo search
            apiUrl = `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=12&cursor=${cursor}`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.code !== 0 && !data.data) {
            return res.status(400).json({ ok: false, error: data.msg || 'Upstream error fetching data' });
        }

        let items = data.data?.videos || data.data || [];

        // Filter photo posts if mode is 'photo'
        if (mode === 'photo') {
            items = items.filter(i => (i.images && i.images.length > 0) || i.is_slideshow);
        }

        res.json({ ok: true, items });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}
