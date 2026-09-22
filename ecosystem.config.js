module.exports = {
  apps: [
    {
      name: 'landing-page',
      script: './node_modules/.bin/tsx',
      args: 'src/server/server.ts' ,
      watch: true,
      env: {
        NODE_OPTIONS: '--openssl-legacy-provider',
      },
    },
  ],
};