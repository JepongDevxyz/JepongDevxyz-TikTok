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

        // Force maximum quality parameter (&hd=1)
        const response = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`);
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

        const item = data.data;

        if (item) {
            // Force No Watermark & HD to use the best available uncompressed source
            const bestQualityStream = item.hdplay || item.play;
            
            item.play = bestQualityStream;
            item.hdplay = bestQualityStream;

            // Fix relative URLs if any
            if (item.play && item.play.startsWith('/')) item.play = `https://tikwm.com${item.play}`;
            if (item.hdplay && item.hdplay.startsWith('/')) item.hdplay = `https://tikwm.com${item.hdplay}`;
            if (item.wmplay && item.wmplay.startsWith('/')) item.wmplay = `https://tikwm.com${item.wmplay}`;
        }

        res.json({ ok: true, item });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}
