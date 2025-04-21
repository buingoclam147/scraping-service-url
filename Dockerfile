# Dockerfile cho Scraping Service
FROM node:16-slim

# Cài đặt Chromium dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    curl \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Chromium
RUN apt-get update && apt-get install -y chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

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