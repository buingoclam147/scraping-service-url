// file: scraper-service.js
import axios from 'axios';
import express from 'express';

const app = express();
const PORT = 3000;
app.use(express.json());
// Proxy config
const PROXY_CONFIG = {
  host: 'proxy-server.scraperapi.com',
  port: 8001,
  auth: {
    username: 'scraperapi',
    password: '3e86cbdaad784ac2382c0d7ae2e0966b',
  },
  protocol: 'http'
};

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  try {
    const response = await axios.get(url, {
      method: 'GET',
      proxy: PROXY_CONFIG,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    console.log(response.data);

    res.send(response.data); // Trả về HTML
  } catch (err) {
    console.error('Scraping error:', err.message);
    res.status(500).json({ error: 'Scraping failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper service is running at http://localhost:${PORT}`);
});
