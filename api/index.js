const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper function to interact with Upstash Redis REST API
async function redisCommand(command, args = []) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;

    try {
        const res = await fetch(`${url}/${command}/${args.join('/')}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.result;
    } catch (e) {
        return null;
    }
}

// Endpoint to fetch current global total downloads
app.get('/api/stats', async (req, res) => {
    let total = await redisCommand('GET', ['total_downloads']);
    if (!total) total = 0; // Default base starting count
    res.json({ ok: true, total: Number(total) });
});

// TikTok Direct Downloader / Resolver Endpoint
app.get('/api/resolve', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) return res.status(400).json({ ok: false, error: 'URL parameter is required' });

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
            const bestQualityStream = item.hdplay || item.play;
            item.play = bestQualityStream;
            item.hdplay = bestQualityStream;

            if (item.play && item.play.startsWith('/')) item.play = `https://tikwm.com${item.play}`;
            if (item.hdplay && item.hdplay.startsWith('/')) item.hdplay = `https://tikwm.com${item.hdplay}`;
            if (item.wmplay && item.wmplay.startsWith('/')) item.wmplay = `https://tikwm.com${item.wmplay}`;
        }

        // Increment Global Counter in Redis (+1 for every successful resolve)
        let newTotal = await redisCommand('INCR', ['total_downloads']);
        if (!newTotal) newTotal = 0;

        res.json({ ok: true, item, globalDownloads: newTotal });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}
