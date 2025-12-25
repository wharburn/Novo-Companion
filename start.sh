#!/bin/bash
# Start NoVo - runs both Python server and React client

echo "🚀 Starting NoVo..."
echo ""

# Kill any existing processes on our ports
lsof -ti:8765 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Activate venv if it exists
if [ -f "../.venv/bin/activate" ]; then
    source ../.venv/bin/activate
fi

# Start Python server in background
echo "🐍 Starting Python server..."
python hume_server.py &
PYTHON_PID=$!

# Wait a moment for Python server to start
sleep 2

# Start React client
echo "⚛️  Starting React client..."
cd client && npm run dev &
REACT_PID=$!

echo ""
echo "✅ NoVo is running!"
echo "   Python server: ws://localhost:8765"
echo "   React client:  http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $PYTHON_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait

