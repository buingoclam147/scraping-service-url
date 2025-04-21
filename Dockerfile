# Dockerfile cho Scraping Service
FROM node:16-slim

# Cài đặt Chromium dependencies
RUN apt-get update && apt-get install -y \
  libxss1 \
  libappindicator3-1 \
  libasound2 \
  libnspr4 \
  libnss3 \
  libgdk-pixbuf2.0-0 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  fonts-liberation \
  libappindicator3-1 \
  libnspr4 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget \
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

# Sử dụng dumb-init để xử lý signals đúng cách
ENTRYPOINT ["dumb-init", "--"]

# Khởi động ứng dụng
CMD ["node", "server.js"]