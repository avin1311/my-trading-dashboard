#!/bin/bash
# Start NSE Dashboard
cd /home/z/my-project/.next/standalone
export PORT=3000
exec node server.js
