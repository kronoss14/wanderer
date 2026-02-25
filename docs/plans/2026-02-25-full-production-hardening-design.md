# Wanderer - Full Production Hardening Design

**Date:** 2026-02-25
**Status:** Approved
**Approach:** C - Full Production Readiness

## Context

Wanderer is a pre-launch Express.js hiking tourism website for Georgia. A senior-level audit revealed critical security vulnerabilities, missing error handling, no input validation, weak session management, and unoptimized file uploads. This design addresses all findings with zero negative UX/UI impact.

## Smoking Guns Found

1. **Hardcoded admin credentials** in `helpers/auth.js` (default password + HMAC secret in source code)
2. **XSS via URL injection** in `hike-detail.ejs` and `gallery-detail.ejs` (unescaped URLs in style attributes)
3. **No CSRF protection** on any form (all POST endpoints vulnerable)
4. **Race condition** in `helpers/data.js` `appendJSON` (concurrent writes lose data)
5. **Zero error handling** on all async routes (any JSON corruption crashes entire site)
6. **No rate limiting** on admin login (brute-force possible)
7. **No input validation** anywhere (any data accepted and stored)
8. **Weak session management** (predictable tokens, no revocation, custom cookie parser)
9. **File uploads validated by extension only** (MIME type not checked, base64 inefficiency)
10. **77MB of unoptimized uploads** (single images up to 7MB)

## Design Sections

### Section 1: Security Hardening (Core)

#### 1.1 Remove Hardcoded Credentials
- **File:** `helpers/auth.js`
- Remove fallback defaults for `ADMIN_PASSWORD` and `COOKIE_SECRET`
- App refuses to start if env vars are missing
- UX impact: None

#### 1.2 Password Hashing with bcrypt
- **File:** `helpers/auth.js`
- Replace plain-text comparison with bcrypt
- Add CLI script to generate hashed password
- UX impact: None

#### 1.3 Login Rate Limiting
- **Files:** `routes/admin.js`
- **Dependency:** `express-rate-limit`
- 5 attempts per 15 minutes per IP
- UX impact: None for legitimate users

#### 1.4 CSRF Protection
- **Files:** All route files with POST endpoints, all form templates
- Add CSRF token generation middleware
- Hidden `_csrf` field in every form
- UX impact: None (hidden field)

#### 1.5 Security Headers
- **File:** `server.js`
- **Dependency:** `helmet`
- CSP, X-Frame-Options, X-Content-Type-Options, etc.
- UX impact: None

#### 1.6 Fix XSS in Templates
- **Files:** `hike-detail.ejs`, `gallery-detail.ejs`, `gallery.ejs`, admin templates
- Escape URLs in style and data attributes
- Validate URLs before storing
- UX impact: None

#### 1.7 CORS Configuration
- **File:** `server.js`
- Explicit CORS policy for own domain only
- UX impact: None

### Section 2: Error Handling & Data Integrity

#### 2.1 Async Error Handler Wrapper
- **Files:** All route files
- `asyncHandler` wrapper for every async route
- Graceful error page instead of crash
- UX impact: Positive (friendly error page instead of blank crash)

#### 2.2 File Locking for JSON Writes
- **File:** `helpers/data.js`
- In-memory mutex for file operations
- Prevents race condition data loss
- UX impact: None

#### 2.3 Graceful JSON Read Fallbacks
- **File:** `helpers/data.js`
- Return `[]` if file missing/corrupted, log error
- Site stays up even with data file issues
- UX impact: Positive (site stays up)

#### 2.4 Email Failure Handling
- **Files:** `routes/contact.js`, `routes/hikes.js`
- Save data regardless of email status
- Honest user feedback
- UX impact: Slightly better messaging

### Section 3: Input Validation

#### 3.1 Server-Side Form Validation
- **Files:** `routes/contact.js`, `routes/hikes.js`, `routes/admin.js`
- **Dependency:** `express-validator`
- Contact: name (max 100), email (valid), subject (max 200), message (max 5000)
- Registration: name (max 100), email (valid), phone (valid format)
- Admin forms: required fields, numeric ranges, valid URLs
- UX impact: Positive (clear validation messages)

#### 3.2 URL Validation for Image Fields
- **File:** `routes/admin.js`
- Allow only `http://`, `https://`, `/images/` schemes
- Reject `javascript:`, `data:` schemes
- UX impact: None for legitimate use

#### 3.3 Enum Validation for Type Fields
- **File:** `routes/admin.js`
- Validate hike type against `['day', 'multi-day', 'cultural']`
- UX impact: None (already uses dropdowns)

#### 3.4 Numeric Range Validation
- **File:** `routes/admin.js`
- Price, distance, elevation, groupSize must be positive and reasonable
- UX impact: None for legitimate use

### Section 4: Session Management & Auth Upgrade

#### 4.1 Replace Custom Cookie Parsing
- **Files:** `server.js`, `helpers/auth.js`
- **Dependency:** `cookie-parser`
- Remove hand-written `parseCookies()`
- UX impact: None

#### 4.2 Proper Session Management
- **Files:** `server.js`, `helpers/auth.js`, `routes/admin.js`
- **Dependency:** `express-session`
- Server-side session storage
- Secure HttpOnly SameSite=Strict cookie
- Session expiration and revocation
- UX impact: None (login/logout works the same)

#### 4.3 Environment Variable Validation on Startup
- **File:** `server.js`
- Check all required env vars on start
- Clear error message and exit if missing
- UX impact: None for users

### Section 5: File Upload Hardening

#### 5.1 Server-Side MIME Type Validation
- **File:** `routes/admin.js`
- Check file magic numbers, not just extension
- UX impact: None for legitimate uploads

#### 5.2 Switch to FormData/Multipart
- **Files:** `public/js/admin-upload.js`, `routes/admin.js`
- **Dependency:** `multer`
- Replace base64 JSON with standard multipart upload
- 33% smaller payloads
- UX impact: Faster uploads

#### 5.3 Image Compression on Upload
- **File:** `routes/admin.js`
- **Dependency:** `sharp`
- Resize to max 1920px width
- Compress to 80% JPEG quality
- Generate 400px thumbnails
- WebP with JPEG fallback
- UX impact: Positive (faster page loads)

#### 5.4 Sanitize Upload Filenames
- **File:** `routes/admin.js`
- UUID-based filenames
- No metadata leakage
- UX impact: None

### Section 6: Logging, Audit & Code Quality

#### 6.1 Admin Action Audit Logging
- **Files:** `routes/admin.js`, new `helpers/logger.js`
- Log all CRUD operations to `data/audit-log.json`
- UX impact: None

#### 6.2 Structured Error Logging
- **Files:** All route files
- Consistent timestamp + path + error logging
- Suppress stack traces in production
- UX impact: None

#### 6.3 Extract Duplicate Form Parsing
- **File:** `routes/admin.js`
- DRY: shared helpers for hike/guide/pricing/gallery form parsing
- UX impact: None

#### 6.4 Consistent String-Based IDs
- **Files:** `routes/admin.js`, `routes/gallery.js`
- Gallery IDs change from numeric to string slugs
- URLs become SEO-friendly: `/gallery/kazbegi-adventure`
- UX impact: Better URLs

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `helmet` | Security headers | ~30KB |
| `express-rate-limit` | Login rate limiting | ~15KB |
| `express-validator` | Input validation | ~50KB |
| `cookie-parser` | Cookie parsing | ~10KB |
| `express-session` | Session management | ~25KB |
| `multer` | Multipart uploads | ~30KB |
| `sharp` | Image processing | ~3MB native |
| `bcrypt` | Password hashing | ~150KB native |

## Files Affected

~25+ files modified, ~1000+ lines changed. All changes preserve existing UX/UI with zero negative visual impact.

## Implementation Order

1. Security hardening (highest risk, no UX change)
2. Error handling & data integrity (prevents crashes)
3. Input validation (prevents bad data)
4. Session management upgrade (better auth)
5. File upload hardening (better performance)
6. Logging, audit & code quality (maintainability)
