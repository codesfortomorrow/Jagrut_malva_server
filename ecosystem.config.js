module.exports = {
  apps: [
    {
      name: 'jagrut-malva',
      script: 'dist/main.js',
      wait_ready: true,
      kill_timeout: 600000, // 10 min
    },
  ],
};
