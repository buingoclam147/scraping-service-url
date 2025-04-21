// sudo docker-compose up --build
// server.js
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');
const chromium = require('@sparticuz/chromium');
// Cấu hình
const PORT = process.env.PORT || 3000;
const TOR_PROXY = process.env.TOR_PROXY || 'http://localhost:3128';

// Sử dụng Stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

// Kiểm tra kết nối proxy Tor
async function checkTorProxy() {
  try {
    const agent = new HttpsProxyAgent(TOR_PROXY);
    console.log('Kiểm tra kết nối proxy Tor...');
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent
    });

    console.log(`Kết nối proxy thành công! IP hiện tại: ${response.data.ip}`);
    return true;
  } catch (error) {
    console.error('Không thể kết nối tới proxy Tor:', error.message);
    return false;
  }
}

// Thay đổi phần khởi tạo Puppeteer trong route /scraping
app.post('/scraping', async (req, res) => {
  const { url, mode = 'html', actions = [] } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL không được để trống' });
  }

  console.log(`➡️ [SCRAPING] Bắt đầu scraping URL: ${url}`);
  console.log(`📦 Tham số truyền vào: mode=${mode}, actions=${actions.length}`);

  let browser;
  try {
    // Kiểm tra đường dẫn Chromium
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    console.log(`🔎 Đường dẫn Chromium được cấu hình: ${execPath}`);

    // Kiểm tra file tồn tại
    const fs = require('fs');
    if (fs.existsSync(execPath)) {
      console.log(`✅ File Chromium tồn tại tại đường dẫn ${execPath}`);
    } else {
      console.error(`❌ KHÔNG TÌM THẤY Chromium tại ${execPath}`);
    }

    console.log('🔄 Puppeteer chuẩn bị launch với các tùy chọn sau:');
    const launchOptions = {
      headless: 'new',
      executablePath: execPath,
      args: [
        // `--proxy-server=${TOR_PROXY}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      timeout: 30000 // 30 giây timeout
    };
    console.log(JSON.stringify(launchOptions, null, 2));

    console.log('👉 Bắt đầu khởi động browser...');
    try {
      browser = await chromium.puppeteer.launch(launchOptions);
      console.log('✅ Puppeteer đã launch xong!');
    } catch (browserError) {
      console.error('❌ Lỗi khi khởi động browser:', browserError);

      // Thử lại với cấu hình đơn giản hơn
      console.log('🔄 Thử lại với cấu hình đơn giản hơn...');
      try {
        browser = await chromium.puppeteer.launch({
          headless: 'new',
          args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('✅ Khởi động thành công với cấu hình đơn giản!');
      } catch (retryError) {
        console.error('❌ Vẫn không thể khởi động browser:', retryError);
        throw retryError;
      }
    }

    console.log('🚀 Khởi động browser thành công!');
    const page = await browser.newPage();
    console.log('✅ Tạo trang mới thành công!');

    // Thông tin về version
    const version = await browser.version();
    console.log(`📊 Phiên bản browser: ${version}`);

    console.log('🌐 Đang truy cập URL:', url);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    console.log('🧑‍💻 Đặt User-Agent thành công');

    await page.setDefaultNavigationTimeout(200000);
    console.log('⏱️ Đặt timeout là 200 giây.');
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('✅ Truy cập URL thành công!');
    let result = null;

    if (mode === 'js' && actions.length > 0) {
      for (const action of actions) {
        console.log(`➡️ Thực thi action:`, action);

        switch (action.type) {
          case 'click':
            await page.click(action.selector);
            break;

          case 'scroll':
            const scrollY = action.y || 500;
            await page.evaluate((y) => {
              window.scrollBy(0, y);
            }, scrollY);
            break;

          case 'waitForSelector':
            await page.waitForSelector(action.selector, { timeout: 10000 });
            break;

          case 'type':
            await page.type(action.selector, action.value || '');
            break;

          case 'html':
            result = await page.content();
            break;

          case 'evaluate':
            result = await page.evaluate(action.script);
            break;

          case 'delay':
            await new Promise(resolve => setTimeout(resolve, action.ms || 1000));
            break;

          default:
            console.warn(`⚠️ Action không hỗ trợ: ${action.type}`);
        }
      }
    } else {
      result = await page.content();
    }

    // await browser.close();
    return res.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Lỗi scraping:', error.message);
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
});



// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// check tor proxy 
app.get('/check-tor-proxy', async (req, res) => {
  const proxyAvailable = await checkTorProxy();
  if (proxyAvailable) {
    res.status(200).json({ status: 'OK', message: 'Proxy Tor hoạt động bình thường.' });
  } else {
    res.status(500).json({ status: 'ERROR', message: 'Không thể kết nối tới proxy Tor.' });
  }
});

// Khởi động server
async function startServer() {
  // Kiểm tra kết nối proxy trước khi khởi động server
  const proxyAvailable = await checkTorProxy();

  if (!proxyAvailable) {
    console.warn('Cảnh báo: Không thể kết nối tới proxy Tor. Server vẫn sẽ khởi động nhưng scraping có thể không hoạt động đúng.');
  }

  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`API scraping có sẵn tại http://localhost:${PORT}/scraping`);
    console.log(`Sử dụng proxy Tor tại: ${TOR_PROXY}`);
  });
}

startServer();