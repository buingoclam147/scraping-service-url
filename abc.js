// xoá các container, image, volume và network không sử dụng
// docker-compose down --volumes --remove-orphans
// docker system prune -af --volumes
// docker builder prune --all --force

// docker-compose build --no-cache
// docker-compose up
import chromium from "@sparticuz/chromium";
import express from "express";
import PQueue from 'p-queue';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const scrapeQueue = new PQueue({ concurrency: 3 }); // Chỉ cho phép 3 job chạy song song

app.post("/scrape", async (req, res) => {
  await scrapeQueue.add(() => handleScrapeWithRetry(req, res));
});

async function handleScrapeWithRetry(req, res) {
  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      console.log(`🔁 Attempt ${attempt + 1}`);
      await handleScrape(req, res);
      return;
    } catch (error) {
      attempt++;
      console.error(`❌ Lỗi ở attempt ${attempt}:`, error.message);
      if (attempt > maxRetries) {
        console.error(`🚫 Tất cả ${maxRetries + 1} attempt đều thất bại.`);
        return res.status(500).json({ error: 'Scraping failed after retries' });
      }
    }
  }
}

async function handleScrape(req, res) {
  const { url, mode = 'html', actions = [], proxy } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--no-zygote',
    '--single-process',
    '--disable-web-security',
    '--disable-blink-features=AutomationControlled'
  ];

  if (proxy) {
    // Sử dụng SOCKS5 proxy
    launchArgs.push(`--proxy-server=socks5://${proxy}`);
    console.log(`🔌 Sử dụng SOCKS5 proxy: ${proxy}`);
  }

  const browser = await puppeteer.launch({
    args: [...chromium.args, ...launchArgs],
    defaultViewport: chromium.defaultViewport,
    headless: 'new',
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
    await page.setDefaultNavigationTimeout(300000);
    await page.goto(url, { waitUntil: 'networkidle2' });

    let result = null;

    if (mode === 'js' && actions.length > 0) {
      for (const action of actions) {
        switch (action.type) {
          case 'click': await page.click(action.selector); break;
          case 'scroll': await page.evaluate((y) => window.scrollBy(0, y), action.y || 500); break;
          case 'waitForSelector': await page.waitForSelector(action.selector, { timeout: 10000 }); break;
          case 'type': await page.type(action.selector, action.value || ''); break;
          case 'html': result = await page.content(); break;
          case 'evaluate': result = await page.evaluate(eval(action.script)); break;
          case 'delay': await new Promise(resolve => setTimeout(resolve, action.ms || 1000)); break;
          default: console.warn(`⚠️ Không hỗ trợ: ${action.type}`);
        }
      }
    } else {
      result = await page.content();
    }

    return res.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Lỗi scraping:', error.message);
    return res.status(500).json({ error: error.message });

  } finally {
    if (page) await page.close();
    await browser.close(); // ⚠️ Đóng browser sau mỗi request
  }
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Khởi động server
async function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`API scraping có sẵn tại http://localhost:${PORT}/scrape`);
  });
}

startServer();
