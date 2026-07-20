# Authentication Endpoints

> **IEKB Section:** 04 — API Contracts  
> **Document:** 02-auth-endpoints.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## POST /api/v1/auth/login

Authenticates a user and establishes a session. Returns a short-lived Access Token in the JSON body and sets a long-lived Refresh Token in an HttpOnly cookie.

**Security:** Public

### Request Body
```json
{
  "email": "admin@towernet.com",
  "password": "Password@123"
}
```

### Responses

**200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Rajesh Patel",
    "email": "rajesh@towernet.com",
    "role": "ADMIN",
    "tenantId": 1
  }
}
```
*Headers:* `Set-Cookie: refresh_token=abc123xyz...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

## POST /api/v1/auth/refresh

Issues a new Access Token using a valid Refresh Token from the request cookies.

**Security:** Requires valid `refresh_token` cookie.

### Request
*(No body required. Relies entirely on cookies.)*

### Responses

**200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
*Headers:* `Set-Cookie: refresh_token=new456xyz...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Refresh token expired or revoked"
  }
}
```

---

## POST /api/v1/auth/logout

Revokes the active refresh token in the database and clears the HttpOnly cookie.

**Security:** Requires valid `refresh_token` cookie.

### Request
*(No body required.)*

### Responses

**200 OK**
```json
{
  "message": "Logged out successfully"
}
```
*Headers:* `Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

---

## POST /api/v1/auth/forgot-password

Initiates the password recovery flow by sending an email with a secure reset link. 

**Security:** Public

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Responses

**200 OK** (Always returns 200, even if email doesn't exist, to prevent enumeration)
```json
{
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

---

## POST /api/v1/auth/reset-password

Completes the password recovery flow using the token provided in the email link.

**Security:** Public

### Request Body
```json
{
  "token": "reset_token_from_email_link",
  "newPassword": "NewStrongPassword123!"
}
```

### Responses

**200 OK**
```json
{
  "message": "Password successfully reset. Please log in with your new password."
}
```

**400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Reset token is invalid or has expired."
  }
}
```

---

## Related Documents

- **Implementation:** [JWT Implementation](../02-auth/01-jwt-implementation.md)
- **Security:** [Password Security](../02-auth/02-password-security.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
