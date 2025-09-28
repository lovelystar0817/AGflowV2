# AGflowV2 Quick Start Guide

## Every time you open this codespace:

### Option 1: Use the setup script (Recommended)
```bash
./start-dev.sh
```

### Option 2: Manual setup (if you prefer)
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start backend server (in one terminal)
npm run dev

# 3. Start frontend server (in another terminal)
npx vite dev
```

## Important URLs:
- **Frontend**: http://localhost:5173 (Your React app)
- **Backend API**: http://localhost:3000 (Express server)

## Key Points:
- Always use `--legacy-peer-deps` when installing dependencies
- Frontend runs on port 5173 (Vite)
- Backend runs on port 3000 (Express)
- Your app will be at http://localhost:5173

## If you see a blank page:
- Make sure you're visiting http://localhost:5173 (not 3000)
- Check that both servers are running
- Run `./start-dev.sh` to restart everything

## Database:
- Your Neon database is already connected
- Tables are already created
- No additional setup needed