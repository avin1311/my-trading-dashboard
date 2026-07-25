#!/bin/bash
# Keepalive script - restarts the Next.js server if it crashes
cd /home/z/my-project

while true; do
  # Kill any existing process on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 1
  
  # Start server
  cd /home/z/my-project/.next/standalone
  PORT=3000 NODE_ENV=production node server.js >> /home/z/my-project/server.log 2>&1
  
  echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/server.log
  sleep 3
done