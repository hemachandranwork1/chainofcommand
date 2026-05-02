#!/bin/bash

# Start Hardhat node in background
echo "Starting Hardhat node..."
npx hardhat node >/dev/null 2>&1 &
NODE_PID=$!

# Wait for node to be ready
sleep 3

# Deploy and seed
echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

echo "Seeding test data..."
npx hardhat run scripts/seed.js --network localhost

# Start frontend (this will block the terminal)
echo "Starting frontend..."
cd frontend
npm run dev

# When frontend stops, kill the Hardhat node
kill $NODE_PID 2>/dev/null
