# 🚀 Finote - Setup Guide

Complete setup instructions for running Finote locally or in production.

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase account (for authentication)
- PostgreSQL (or SQLite for local dev)
- (Optional) OpenAI API key for AI features

## 🛠️ Installation

### 1. Install dependencies

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Environment Setup

Create `server/.env`:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/finote_db"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
OPENAI_API_KEY="sk-..."
SESSION_SECRET="generate-a-random-32-char-string"
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

### 3. Database Setup

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run

```bash
npm run dev
```

Client: http://localhost:5173  
Server: http://localhost:3001
