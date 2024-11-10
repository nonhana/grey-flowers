# 使用 Node.js 22 版本的官方镜像作为基础镜像
FROM node:22

# 设置工作目录为 /data
WORKDIR /data

# 复制当前目录下的所有文件到容器的 /data 目录中
COPY . /data

# 创建 logs 目录
RUN mkdir -p data/logs

# 安装pm2
RUN npm install pm2 -g

# 全局安装 pnpm
RUN npm install -g pnpm

# 使用 pnpm 安装项目依赖
RUN pnpm install

# 运行项目构建命令
RUN pnpm run build
