// server.js
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

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

// API scraping
// app.post('/scraping', async (req, res) => {
//   const { url, js = false, script = '' } = req.body;

//   if (!url) {
//     return res.status(400).json({ error: 'URL không được để trống' });
//   }

//   console.log(`➡️ [SCRAPING] Bắt đầu scraping URL: ${url}`);
//   console.log(`📦 Tham số truyền vào: js=${js}, có script=${!!script}`);

//   let browser;
//   try {
//     console.log('🚀 Khởi động browser với proxy Tor...');
//     browser = await puppeteer.launch({
//       headless: false,
//       args: [
//         `--proxy-server=${TOR_PROXY}`,
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--disable-gpu'
//       ]
//     });

//     const page = await browser.newPage();

//     // Thiết lập User-Agent
//     const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36';
//     await page.setUserAgent(userAgent);
//     console.log(`🧑‍💻 Đặt User-Agent: ${userAgent}`);

//     // Timeout
//     await page.setDefaultNavigationTimeout(200000);
//     console.log('⏱️ Đặt timeout là 200 giây.');

//     // Truy cập URL
//     console.log(`🌐 Đang truy cập URL: ${url} ...`);
//     await page.goto(url, { waitUntil: 'networkidle2' });
//     console.log('✅ Truy cập URL thành công!');

//     let result;
//     if (js && script) {
//       console.log('💡 Thực thi script tuỳ chỉnh...');
//       result = await page.evaluate((scriptContent) => {
//         try {
//           // eslint-disable-next-line no-eval
//           return eval(scriptContent);
//         } catch (error) {
//           return { error: error.message };
//         }
//       }, script);
//     } else {
//       console.log('📄 Lấy nội dung HTML của trang...');
//       result = await page.content();
//     }

//     console.log('✅ Scraping thành công, trả về kết quả.');
//     await browser.close();
//     return res.json({ success: true, data: result });

//   } catch (error) {
//     console.error('❌ Lỗi scraping:', error.message);
//     if (browser) await browser.close();
//     return res.status(500).json({ error: error.message });
//   }
// });

app.post('/scraping', async (req, res) => {
  const { url, mode = 'html', actions = [] } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL không được để trống' });
  }

  console.log(`➡️ [SCRAPING] Bắt đầu scraping URL111: ${url}`);
  console.log(`📦 Tham số truyền vào111: mode=${mode}, actions=${actions.length}`);

  let browser;
  try {
    console.log(puppeteer);
    console.log('🔄 Puppeteer chuẩn bị launch...111');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--proxy-server=${TOR_PROXY}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    console.log('✅ Puppeteer đã launch xong!');
    console.log('🚀 Khởi động browser với proxy Tor...');
    const page = await browser.newPage();
    console.log('🌐 Đang truy cập URL:', url);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    console.log('🧑‍💻 Đặt User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
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