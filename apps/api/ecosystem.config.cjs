const path = require('node:path');

module.exports = {
  apps: [
    {
      // 基础配置
      name: 'greyflowers-api',
      script: './dist/main.mjs',
      cwd: __dirname,

      // 运行模式
      exec_mode: 'fork',
      instances: 1,

      // 环境配置
      env_file: '../../.env',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // 日志配置
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,

      // 重启策略
      autorestart: true,
      max_restarts: 10,
      exp_backoff_restart_delay: 1000,
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,

      // 内存管理
      max_memory_restart: '500M',

      // 监听配置
      watch: false,

      // Node.js 参数
      node_args: ['--max-old-space-size=512'],

      // 高级配置
      treekill: true,
      shutdown_with_message: false,
      source_map_support: false,
    },
  ],
};
