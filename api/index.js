const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// URL Resolver Endpoint
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
            return res.status(500).json({ ok: false, error: 'Upstream returned invalid response format.' });
        }

        if (data.code !== 0) {
            return res.status(400).json({ ok: false, error: data.msg || 'Failed to fetch TikXedd media' });
        }

        res.json({ ok: true, item: data.data });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Resilient Feed & Search Endpoint
app.get('/api/feed', async (req, res) => {
    try {
        const { mode = 'trending', q = '', cursor = 0 } = req.query;
        let apiUrl = '';

        if (mode === 'trending') {
            apiUrl = `https://tikwm.com/api/feed/list?region=US&count=12`;
        } else {
            // Unified search for Video, Photo, and Music keywords
            const queryParam = encodeURIComponent(q || 'viral');
            const currentCursor = isNaN(cursor) || cursor < 0 ? 0 : cursor;
            apiUrl = `https://tikwm.com/api/feed/search?keywords=${queryParam}&count=12&cursor=${currentCursor}`;
        }

        const response = await fetch(apiUrl);
        const textData = await response.text();

        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            return res.status(500).json({ ok: false, error: 'Upstream feed service timeout.' });
        }

        if (!data || data.code !== 0) {
            return res.status(400).json({ ok: false, error: data.msg || 'No feed items found for this query.' });
        }

        let items = data.data?.videos || data.data?.posts || data.data || [];

        // Mode Filters
        if (mode === 'photo') {
            const photoItems = items.filter(i => (i.images && i.images.length > 0) || i.is_slideshow);
            if (photoItems.length > 0) items = photoItems;
        } else if (mode === 'music') {
            const musicItems = items.filter(i => i.music || i.music_info);
            if (musicItems.length > 0) items = musicItems;
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
