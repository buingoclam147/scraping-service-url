# Dùng image chính thức của Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Tạo thư mục làm việc
WORKDIR /app

# Copy file cấu hình và code
COPY package*.json ./
RUN npm install
COPY . .

# Biến môi trường cần thiết
ENV NODE_ENV=production \
    TOR_PROXY=http://tor-proxy:3128

# Mở cổng 3000
EXPOSE 3000

# Khởi chạy app
CMD ["node", "server.js"]
