// xoá các container, image, volume và network không sử dụng
// docker-compose down --volumes --remove-orphans
// docker system prune -af --volumes
// docker builder prune --all --force

// docker-compose build --no-cache
// docker-compose up
import chromium from "@sparticuz/chromium";
import dotenv from 'dotenv';
import express from "express";
import PQueue from 'p-queue';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
dotenv.config();

puppeteer.use(StealthPlugin());
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const TOR_PROXY = process.env.TOR_PROXY || 'http://localhost:3128';
const scrapeQueue = new PQueue({ concurrency: 3 }); // Chỉ cho phép 3 job chạy song song


let browser; // Khởi tạo biến browser toàn cục

async function initBrowser() {
  browser = await puppeteer.launch({
    args: [...chromium.args,
    ...[
      // `--proxy-server=${TOR_PROXY}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-web-security',
      '--disable-blink-features=AutomationControlled'
    ]
    ],
    defaultViewport: chromium.defaultViewport,
    headless: true,
  });

  console.log('🚀 Puppeteer browser đã được khởi tạo!');
}

// async function checkTorProxy() {
//   try {
//     const agent = new HttpsProxyAgent(TOR_PROXY);
//     console.log('Kiểm tra kết nối proxy Tor...');
//     const response = await axios.get('https://api.ipify.org?format=json', {
//       httpsAgent: agent
//     });

//     console.log(`Kết nối proxy thành công! IP hiện tại: ${response.data.ip}`);
//     return true;
//   } catch (error) {
//     console.error('Không thể kết nối tới proxy Tor:', error.message);
//     return false;
//   }
// }


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
  const { url, mode = 'html', actions = [] } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  let page;

  try {
    if (!browser) throw new Error('Browser chưa được khởi tạo.');

    page = await browser.newPage(); // Dùng browser đã khởi tạo
    await page.setUserAgent('Mozilla/5.0 ... Safari/537.36');
    await page.setDefaultNavigationTimeout(300000);
    await page.goto(url, { waitUntil: 'domcontentloaded' }); // Chờ đến khi DOM đã tải xong
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Protected by Anubis') === false;
    }, { timeout: 60000 }); // chờ max 60s để JS PoW chạy xong

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
    if (page) {
      await page.close(); // Chỉ đóng page, KHÔNG đóng browser
    }
  }
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// check tor proxy 
// app.get('/check-tor-proxy', async (req, res) => {
//   const proxyAvailable = await checkTorProxy();
//   if (proxyAvailable) {
//     res.status(200).json({ status: 'OK', message: 'Proxy Tor hoạt động bình thường.' });
//   } else {
//     res.status(500).json({ status: 'ERROR', message: 'Không thể kết nối tới proxy Tor.' });
//   }
// });

// Khởi động server
async function startServer() {
  // Kiểm tra kết nối proxy trước khi khởi động server
  // const proxyAvailable = await checkTorProxy();

  // if (!proxyAvailable) {
  //   console.warn('Cảnh báo: Không thể kết nối tới proxy Tor. Server vẫn sẽ khởi động nhưng scraping có thể không hoạt động đúng.');
  // }
  await initBrowser(); // ⚠️ Gọi trước khi start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`API scraping có sẵn tại http://localhost:${PORT}/scrape`);
    // console.log(`Sử dụng proxy Tor tại: ${TOR_PROXY}`);
  });
}

startServer();
