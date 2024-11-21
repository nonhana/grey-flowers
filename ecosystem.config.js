const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'grey-flowers',
      port: 2408,
      cwd: path.join(__dirname),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      script: './.output/server/index.mjs',
    },
  ],
}
