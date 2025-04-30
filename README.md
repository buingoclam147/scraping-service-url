# Web Scraping Service with Tor Proxy

Service API scraping sử dụng Puppeteer với proxy Tor để thu thập dữ liệu từ các trang web với khả năng xoay vòng IP tự động.

## Tính năng

- Thu thập dữ liệu từ bất kỳ trang web nào
- Hỗ trợ JavaScript: Có thể thực thi mã JavaScript tùy chỉnh trên trang
- Sử dụng Tor proxy để ẩn danh và xoay vòng địa chỉ IP
- Puppeteer-stealth để tránh bị phát hiện là bot
- API dễ sử dụng

## Cài đặt và chạy

### Yêu cầu

- Docker và Docker Compose
- Node.js (nếu chạy trực tiếp)

### Chạy với Docker Compose (Khuyến nghị)

1. Clone repository
2. Chạy lệnh:

```bash
docker-compose up -d
```

Service sẽ chạy tại http://localhost:3000

### Chạy trực tiếp (Cần cài đặt Tor proxy riêng)

1. Cài đặt dependencies:

```bash
npm install
```

2. Chạy Tor proxy:

```bash
docker run --rm -it -p 3128:3128 zhaowde/rotating-tor-http-proxy
```

3. Chạy service:

```bash
npm start
```

## Sử dụng API

### API Scraping

**Endpoint:** `POST /scraping`

**Body:**

```json
{
  "url": "https://example.com",
  "js": false,
  "script": "optional JavaScript code"
}
```

- `url`: (bắt buộc) URL của trang cần thu thập dữ liệu
- `js`: (tùy chọn) Boolean, nếu true sẽ thực thi script JavaScript
- `script`: (tùy chọn) Mã JavaScript cần thực thi trên trang

**Ví dụ không có script:**

```bash
curl -X POST http://localhost:3000/scraping \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Ví dụ với script:**

```bash
curl -X POST http://localhost:3000/scraping \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "js": true,
    "script": "return document.querySelectorAll(\"h1\").length"
  }'
```

## Triển khai trên Oracle Cloud

Xem hướng dẫn triển khai trong tài liệu hướng dẫn.# dotai-crawler
