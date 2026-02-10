# AI Prompt Optimizer

A web application that transforms simple prompts into comprehensive, structured instructions optimized for AI coding assistants using Anthropic's API.

## Features

- 🧠 **Intelligent Optimization**: Uses advanced AI models to enhance prompts with structured frameworks
- 🔄 **Real-time Streaming**: Watch your prompt transform in real-time
- 📋 **Auto-Copy**: Automatically copies the optimized prompt to your clipboard
- 🎯 **Role-Based Context**: Tailor optimizations to your specific expertise
- 🛡️ **Secure**: API key never exposed to the client (proxy pattern)
- ⚡ **Rate Limited**: 10 requests per minute per IP to prevent abuse

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Your API Key

Create a `.env.local` file in the root directory:

```bash
# .env.local
ANTHROPIC_API_KEY=your_api_key_here
```

Get your API key from [Anthropic Console](https://console.anthropic.com/settings/keys).

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter your role** (e.g., "Senior Backend Engineer", "Python Expert") or select from presets
2. **Enter your raw prompt** (e.g., "create a REST API for user management")
3. **Click "Optimize Prompt"**
4. **Watch the optimization stream** in real-time
5. **Optimized prompt is automatically copied** to your clipboard when complete

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Anthropic TypeScript SDK
- **Deployment**: Dockerized for Coolify/VPS deployment

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page with state management
│   ├── globals.css             # Tailwind styles
│   └── api/
│       └── optimize/
│           └── route.ts        # Streaming API route
├── components/
│   ├── RoleInput.tsx           # Role input with presets
│   ├── PromptTextarea.tsx      # Prompt input with auto-resize
│   ├── OptimizeButton.tsx      # Optimize button with loading state
│   ├── ResultPanel.tsx         # Streaming result display
│   ├── CopyButton.tsx          # Manual copy button
│   └── ErrorBanner.tsx         # Error display
├── lib/
│   ├── prompts.ts              # System prompt (core IP)
│   ├── anthropic.ts            # Anthropic SDK client
│   └── rate-limit.ts           # Rate limiting logic
└── .env.local                  # API key (git-ignored)
```

## Key Files

- **`lib/prompts.ts`**: Contains the system prompt that defines optimization quality (core intellectual property)
- **`app/api/optimize/route.ts`**: Handles streaming API requests to Anthropic
- **`app/page.tsx`**: Main UI with state management and SSE parsing

## Security & Architecture

### Proxy Pattern Implementation

This app implements a secure proxy pattern to protect your API key:

1. **Frontend** (`app/page.tsx`): Calls `/api/optimize` (internal Next.js route)
2. **API Route** (`app/api/optimize/route.ts`):
   - Reads `process.env.ANTHROPIC_API_KEY` (server-side only)
   - Validates input and checks rate limits
   - Calls Anthropic API
   - Streams response back to frontend
3. **Client**: Never sees or accesses the API key

### Security Features

- ✅ API key stored server-side only (`.env.local` for local, container env vars for production)
- ✅ All Anthropic API calls proxied through Next.js API routes
- ✅ Rate limiting prevents abuse (10 req/min per IP)
- ✅ Input validation (10,000 character limit)
- ✅ Same-origin CORS policy
- ✅ Server-side request validation
- ✅ Docker non-root user (enhanced container security)

## Performance

- Time to first byte: < 2 seconds
- Total optimization: 2-8 seconds (model-dependent)
- Auto-copy latency: < 100ms

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deployment

This application is optimized for deployment on **Coolify** (self-hosted on your VPS) using Docker.

### Quick Start with Coolify

#### Prerequisites
- Coolify installed on your VPS ([coolify.io](https://coolify.io))
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)

#### Deploy in 3 Steps

1. **Add to Coolify**
   - Login to your Coolify dashboard
   - Click "New Project" → "Git Repository"
   - Connect: `Looking4OffSwitch/ai-prompt-optimizer`
   - Branch: `main`

2. **Set Environment Variable**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

3. **Deploy**
   - Coolify auto-detects Dockerfile
   - Click "Deploy"
   - Done! 🚀

### Alternative: Manual Docker Deployment

```bash
# Clone repository
git clone https://github.com/Looking4OffSwitch/ai-prompt-optimizer.git
cd ai-prompt-optimizer

# Create environment file
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local

# Build and run with Docker Compose
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

### Full Deployment Guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive instructions including:
- Coolify configuration
- Nginx reverse proxy setup
- SSL certificate installation
- Monitoring and maintenance
- Troubleshooting
- Production checklist

## License

ISC
