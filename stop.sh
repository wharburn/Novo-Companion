#!/bin/bash
# Stop NoVo - kills Python server and React client

echo "🛑 Stopping NoVo..."

# Kill Python server (port 8765)
lsof -ti:8765 | xargs kill -9 2>/dev/null && echo "   Stopped Python server"

# Kill React client (port 5173)
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "   Stopped React client"

# Kill any node processes from vite
pkill -f "vite" 2>/dev/null

echo "✅ Done"

