# 使用 Node 20，与本地一致
FROM node:20-slim

WORKDIR /app

# 只安装生产依赖（无 build 工具链）
COPY package*.json ./
RUN npm ci --omit=dev

# 复制源码和已构建的前端
COPY . .

# 暴露端口
EXPOSE 3001

# Railway 会执行这个 start.sh（见 package.json）
CMD ["sh", "start.sh"]
