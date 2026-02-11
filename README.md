# AI Prompt Optimizer

A secure web application that transforms simple prompts into comprehensive, structured instructions optimized for AI coding assistants using Anthropic's API.

## Features

- 🧠 **Intelligent Optimization**: Uses advanced AI models to enhance prompts with structured frameworks
- 🔄 **Real-time Streaming**: Watch your prompt transform in real-time
- 📋 **Auto-Copy**: Automatically copies the optimized prompt to your clipboard
- 🎯 **Role-Based Context**: Tailor optimizations to your specific expertise
- 🔐 **Secure Authentication**: Multi-user support with bcrypt password hashing
- 🛡️ **Enterprise Security**: Rate limiting, session management, comprehensive audit logging
- ⚡ **Fast**: Edge runtime middleware for optimal performance

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Get your API key from [Anthropic Console](https://console.anthropic.com/settings/keys).

### 3. Add Users

```bash
npm run add-user
```

Follow the prompts to create your first user. Repeat for additional users.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to login.

## Authentication & Security

This application includes enterprise-grade authentication:

- **Multi-user support** via secure `users.json` file
- **Bcrypt password hashing** (12 rounds)
- **Rate limiting**: 5 failed login attempts = 15-minute lockout
- **Session security**: HTTP-only cookies, 24-hour expiration
- **Per-user logging**: All requests tracked by username
- **Attack protection**: Brute force, XSS, CSRF, timing attacks all mitigated

### User Management Commands

```bash
npm run add-user           # Add a new user
npm run list-users         # List all users
npm run remove-user        # Remove a user
npm run update-password    # Change a user's password
```

**See [SECURITY.md](./SECURITY.md) for complete authentication and security documentation.**

## Usage

1. **Login** with your credentials
2. **Enter your role** (e.g., "Senior Backend Engineer", "Python Expert")
3. **Enter your raw prompt** (e.g., "create a REST API for user management")
4. **Click "Optimize Prompt"**
5. **Optimized prompt is automatically copied** to your clipboard when complete
6. **Logout** using the button in the top-right corner

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Anthropic TypeScript SDK
- **Authentication**: Bcrypt + secure sessions
- **Deployment**: Dockerized for VPS deployment

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page (authenticated)
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── globals.css             # Tailwind styles
│   └── api/
│       ├── optimize/
│       │   └── route.ts        # Streaming optimization API
│       └── auth/
│           ├── login/          # Login endpoint
│           └── logout/         # Logout endpoint
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
│   ├── auth.ts                 # Authentication (Node.js runtime)
│   ├── auth-edge.ts            # Auth for middleware (Edge runtime)
│   ├── logger.ts               # Structured logging
│   ├── validation.ts           # Input validation
│   └── rate-limit.ts           # Rate limiting logic
├── scripts/
│   └── manage-users.ts         # CLI for user management
├── middleware.ts               # Route protection
├── users.json                  # User credentials (gitignored)
└── .env.local                  # Environment variables (gitignored)
```

## Key Files

- **`lib/prompts.ts`**: System prompt that defines optimization quality
- **`lib/auth.ts`**: Multi-user authentication with bcrypt
- **`app/api/optimize/route.ts`**: Streaming API with user tracking
- **`middleware.ts`**: Route protection and session validation
- **`scripts/manage-users.ts`**: CLI for user management

## Security Architecture

### Authentication Flow

1. **User visits app** → Middleware checks session → Redirects to `/login` if not authenticated
2. **User logs in** → Credentials verified with bcrypt → Session created with HTTP-only cookie
3. **User accesses app** → Middleware validates session → Grants access
4. **User makes requests** → API logs username → Tracks per-user activity

### Security Features

- ✅ **Password Security**: Bcrypt hashing (12 rounds), cannot be reversed
- ✅ **Session Security**: Cryptographic tokens (256-bit), HTTP-only cookies, 24-hour expiration
- ✅ **Rate Limiting**:
  - Login: 5 attempts → 15-minute lockout
  - API: 10 requests/minute per IP
- ✅ **Attack Protection**:
  - Brute force: Impossible (rate limiting + bcrypt)
  - XSS: Protected (HTTP-only cookies)
  - CSRF: Protected (SameSite cookies)
  - Timing attacks: Protected (constant-time comparison)
  - Username enumeration: Protected (generic errors)
- ✅ **Audit Logging**: All auth events and API requests logged with username
- ✅ **Input Validation**: Type checking, length limits, UTF-8 validation, sanitization

### API Key Protection

- API key stored server-side only (`.env.local` for local, env vars for production)
- All Anthropic API calls proxied through Next.js API routes
- Client never sees or accesses the API key
- Docker non-root user for enhanced container security

## Logging

All requests and authentication events are logged with structured JSON:

```json
{
  "timestamp": "2024-02-10T12:34:56.789Z",
  "level": "INFO",
  "message": "Optimization completed",
  "requestId": "req_1707567296789_abc123",
  "username": "alice",
  "displayName": "Alice Smith",
  "userPrompt": "Create a REST API",
  "llmResponse": "...",
  "approximateTokens": 2847,
  "streamDuration": 2334
}
```

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript checks

# User Management
npm run add-user         # Add a new user
npm run list-users       # List all users
npm run remove-user      # Remove a user
npm run update-password  # Update user password
npm run manage-users     # Show user management help
```

## Deployment

This application is optimized for deployment on your own VPS using Docker.

### Quick Deploy

```bash
# Clone repository
git clone <your-repo-url>
cd prompt_rewriter

# Set up environment
cp .env.example .env.local
nano .env.local  # Add your ANTHROPIC_API_KEY

# Add users
npm install
npm run add-user

# Build and run
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

### Full Deployment Guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive instructions including:
- Docker deployment
- Reverse proxy setup (Nginx/Caddy)
- SSL certificate installation
- Production security hardening
- Monitoring and maintenance
- Troubleshooting

## Documentation

- **[README.md](./README.md)** - This file (overview and quick start)
- **[SECURITY.md](./SECURITY.md)** - Authentication, security, and user management
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide

## Performance

- Authentication check: < 50ms (Edge runtime)
- Time to first byte: < 2 seconds
- Total optimization: 2-8 seconds (model-dependent)
- Auto-copy latency: < 100ms

## Troubleshooting

### Can't login
- Verify user exists: `npm run list-users`
- Check username/password spelling (case-insensitive username)
- Wait 15 minutes if account is locked

### Users file issues
- Ensure `users.json` exists in project root
- Check file permissions: `chmod 600 users.json`
- Verify JSON structure is valid

### Session expires
- Default: 24 hours
- Sessions cleared on logout
- Browser cookies can be cleared manually

See **[SECURITY.md](./SECURITY.md)** for detailed troubleshooting.

## License

ISC
