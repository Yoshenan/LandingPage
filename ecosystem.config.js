module.exports = {
  apps: [
    {
      name: 'landing-page',
      script: './node_modules/.bin/tsx',
      args: 'src/server/server.ts',
      watch: true,
      env: {
        NODE_OPTIONS: '--openssl-legacy-provider',
      },
    },

    {
      name: 'telegram-bot',
      script: './node_modules/.bin/tsx',
      args: 'src/server/bot.ts',
      watch: true,
      env: {
        NODE_OPTIONS: '--openssl-legacy-provider',
      },
    },
  ],
};