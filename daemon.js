const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFd = fs.openSync(path.join(__dirname, 'daemon_server.log'), 'a');

const child = spawn('node', ['server.js'], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
  cwd: path.join(__dirname, '.next/standalone'),
  env: { ...process.env, NODE_ENV: 'production' }
});

child.unref();
console.log(`Daemon child PID: ${child.pid}`);
setTimeout(() => process.exit(0), 1000);
