# Security & Authentication

Complete guide for the authentication system, security features, and user management.

---

## Quick Start

### 1. Add Users

```bash
npm run add-user
```

You'll be prompted for username (min 3 chars), display name (optional), and password (min 8 chars).

### 2. Start Application

```bash
npm run dev
```

### 3. Login

Navigate to `http://localhost:3000` and login with your credentials.

---

## User Management

### Commands

```bash
npm run add-user           # Add a new user
npm run list-users         # List all users
npm run remove-user        # Remove a user
npm run update-password    # Change password
```

### Users File

Users are stored in `users.json` (gitignored):

```json
{
  "users": [
    {
      "username": "alice",
      "passwordHash": "$2a$12$...",
      "displayName": "Alice Smith",
      "createdAt": "2024-02-10T12:34:56.789Z"
    }
  ]
}
```

**Important**: Never edit manually - use CLI commands only.

---

## Security Architecture

### Password Security

- **Bcrypt hashing**: 12 salt rounds (industry standard)
- **Cannot be reversed**: Safe even if `users.json` is compromised
- **Unique salts**: Each password hashed differently
- **Slow by design**: 2-3 seconds prevents brute force

### Session Security

- **Cryptographic tokens**: 256-bit random (crypto.randomBytes)
- **HTTP-only cookies**: JavaScript cannot access
- **Secure flag**: HTTPS-only in production (NODE_ENV=production)
- **SameSite**: Lax (CSRF protection)
- **Expiration**: 24 hours

### Rate Limiting

**Login attempts:**
- 5 failed attempts → 15-minute lockout
- Per-username tracking
- Automatic reset after lockout

**API requests:**
- 10 requests/minute per IP

### Attack Protection

| Attack | Protection | Status |
|--------|-----------|--------|
| Brute force | Rate limiting + bcrypt | ✅ Impossible |
| Password cracking | Bcrypt (12 rounds) | ✅ Millions of years |
| Session hijacking | Crypto tokens | ✅ Impossible to guess |
| XSS | HTTP-only cookies | ✅ Blocked |
| CSRF | SameSite cookies | ✅ Blocked |
| Timing attacks | Constant-time comparison | ✅ Protected |
| Username enumeration | Generic errors | ✅ Protected |

---

## Authentication Flow

1. User visits app → Middleware checks session
2. No session → Redirect to `/login`
3. User submits credentials → POST `/api/auth/login`
4. Bcrypt verifies password → Create session
5. HTTP-only cookie set → Redirect to app
6. Subsequent requests → Middleware validates session

---

## Logging

All authentication events logged with structured JSON:

**Successful login:**
```json
{
  "level": "INFO",
  "message": "Successful authentication",
  "username": "alice",
  "displayName": "Alice Smith"
}
```

**Failed attempt:**
```json
{
  "level": "WARN",
  "message": "Failed authentication: invalid password",
  "username": "alice",
  "attemptCount": 2,
  "remainingAttempts": 3
}
```

**API request:**
```json
{
  "level": "INFO",
  "message": "Optimization completed",
  "username": "alice",
  "userPrompt": "Create a REST API",
  "llmResponse": "...",
  "approximateTokens": 2847
}
```

---

## Configuration

### Session Duration

Edit `lib/auth.ts`:

```typescript
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
```

### Rate Limits

Edit `lib/auth.ts`:

```typescript
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,                    // Max failed attempts
  lockoutDuration: 15 * 60 * 1000,   // 15 minutes
  attemptWindow: 5 * 60 * 1000,      // 5 minute window
};
```

---

## Troubleshooting

### Can't Login

**Check:**
1. User exists: `npm run list-users`
2. Username/password spelling (username is case-insensitive)
3. Account not locked (wait 15 minutes or remove/re-add user)
4. Check server logs for specific error

### Account Locked

**Solutions:**
- Wait 15 minutes for automatic unlock
- Remove and re-add user: `npm run remove-user && npm run add-user`

### "Users file does not exist"

Run `npm run add-user` to create first user.

### "Password hashing is slow"

This is normal! Bcrypt intentionally takes 2-3 seconds for security.

### Session Expires

Default is 24 hours. To change, edit `SESSION_DURATION_MS` in `lib/auth.ts`.

---

## Production Deployment

### Before Deploying

1. **Add users**:
   ```bash
   npm run add-user  # Repeat for each user
   npm run list-users  # Verify
   ```

2. **Set file permissions**:
   ```bash
   chmod 600 users.json
   ```

3. **Test authentication**:
   - Valid login ✅
   - Invalid password ❌
   - 5 failed attempts (locks) ❌
   - Wait 15 minutes (unlocks) ✅

### Deployment Steps

1. Copy `users.json` to server:
   ```bash
   scp users.json user@server:/path/to/app/
   ```

2. Set permissions:
   ```bash
   chmod 600 /path/to/app/users.json
   ```

3. Enable HTTPS (required for secure cookies)

4. Set environment:
   ```bash
   NODE_ENV=production
   ANTHROPIC_API_KEY=your-key
   ```

5. Start:
   ```bash
   npm run build && npm run start
   ```

### Security Checklist

- [ ] Strong passwords (12+ characters)
- [ ] `users.json` permissions: 600
- [ ] `users.json` not in version control
- [ ] HTTPS enabled
- [ ] Environment variables set
- [ ] Backup strategy for `users.json`
- [ ] Monitoring configured

---

## Best Practices

### Passwords

**Enforced:**
- Minimum 8 characters
- UTF-8 encoded

**Recommended:**
- 12+ characters
- Mix of uppercase, lowercase, numbers, symbols
- Unique to this application
- Use password manager

### User Management

**Adding users:**
- Document who has access
- Use descriptive display names
- Test login immediately
- Keep backups

**Removing users:**
- Backup first
- Verify username
- Check logs for recent activity
- Document removal

**Password rotation:**
- Every 90 days
- After suspected compromise
- When requested
- Keep external history

### Monitoring

**Watch for:**
- Multiple failed login attempts
- Unusual login patterns
- Account lockouts
- Logins from unexpected IPs

**Regular tasks:**
- Review user list weekly
- Monitor logs for failed attempts
- Remove inactive users
- Audit access patterns

---

## Advanced Topics

### Backup Strategy

```bash
# Daily backup (cron)
0 2 * * * cp /path/to/users.json /backups/users.$(date +\%Y\%m\%d).json

# Keep 30 days
find /backups -name "users.*.json" -mtime +30 -delete
```

**Restore:**
```bash
cp /backups/users.20240210.json users.json
chmod 600 users.json
```

### Scaling

**Current capacity:**
- Small teams (2-20 users) ✅
- Moderate traffic ✅
- Single server ✅

**For 50+ users:**
- Database storage (PostgreSQL/MySQL)
- Distributed rate limiting (Redis)
- Load balancer session affinity
- Centralized logging

### Edge Runtime

The middleware uses `lib/auth-edge.ts` (no file system access) for Edge runtime compatibility. API routes use `lib/auth.ts` (full Node.js) which verifies users against `users.json`.

This is secure because:
- Sessions are cryptographically secure (cannot be forged)
- Sessions expire after 24 hours
- API routes still verify user exists
- Worst case: deleted user accesses UI but API blocks them

---

## API Reference

### POST /api/auth/login

**Request:**
```json
{
  "username": "alice",
  "password": "password123"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "username": "alice",
  "displayName": "Alice Smith"
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

### POST /api/auth/logout

**Success (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Security Testing

### Verify Protections

**Brute force:**
```bash
# Try 5 wrong passwords
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# 6th attempt should be blocked
```

**Session expiry:**
```bash
# Login, wait 24+ hours, should need to re-login
```

**XSS:**
```javascript
// In browser console
document.cookie  // Should NOT see auth_session
```

---

## Summary

✅ **Secure**: Bcrypt, rate limiting, secure sessions, attack protection
✅ **Easy**: CLI commands for all user operations
✅ **Flexible**: Add/remove users anytime
✅ **Monitored**: Comprehensive logging
✅ **Production-ready**: Enterprise-grade security

**Get started:**
```bash
npm run add-user
npm run dev
```

Then login at `http://localhost:3000`
