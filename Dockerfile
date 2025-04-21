# Dockerfile cho Scraping Service
FROM node:16-slim

# Cài đặt Chromium dependencies
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libasound2 \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    libappindicator3-1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    --no-install-recommends

# Cài đặt Chromium
RUN apt-get update && apt-get install -y chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Cấp quyền cho Chromium
RUN chmod -R o+rx /usr/bin/chromium

# Tạo thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy source code
COPY . .

# Biến môi trường cho Puppeteer sử dụng Chromium đã cài đặt
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    TOR_PROXY=http://tor-proxy:3128

# Port mà ứng dụng sử dụng
EXPOSE 3000


# Khởi động ứng dụng
CMD ["node", "server.js"]