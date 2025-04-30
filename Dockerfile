FROM node:20-slim

# Cài đặt các thư viện phụ thuộc cho Chromium
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgdk-pixbuf2.0-0 \
  libgl1 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxkbcommon0 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*
  

# Thiết lập làm việc trong thư mục /app
WORKDIR /app

# Copy package.json và cài đặt các dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn của ứng dụng vào Docker container
COPY . .

# Biến môi trường cho Puppeteer sử dụng Chromium đã cài đặt
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    TOR_PROXY=http://tor-proxy:3128

# Port mà ứng dụng sử dụng
EXPOSE 3000

# Chạy ứng dụng
CMD ["node", "index.js"]
