module.exports = {
  apps: [
    {
      name: 'grey-flowers',
      port: 2408,
      script: '/data/.output/server/index.mjs',
      cwd: '/data/',
      node_args: '--harmony',
      watch: false, // 是否监视文件变化
      instances: 1, // 启动实例数量
      exec_mode: 'fork', // 进程执行模式
      autorestart: true, // 是否自动重启
      max_memory_restart: '1G', // 最大内存限制，达到限制时自动重启
      env: {
        NODE_ENV: 'production', // 环境变量
      },
      error_file: '/data/logs/pm2-error.log', // 错误日志文件路径
      out_file: '/data/logs/pm2-out.log', // 输出日志文件路径
      merge_logs: true, // 是否合并日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志时间格式
      min_uptime: '60s', // 最小运行时间
      kill_timeout: 3000, // 关闭超时时间
    },
  ],
}
