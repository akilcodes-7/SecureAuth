# Secure 2FA App (Email Verification + 2FA)

## Features
- Signup: Email+Password + choose 2FA method (Authenticator / Email OTP)
- Email ownership verification (OTP) **before** enabling 2FA
- Authenticator setup (QR) after email verification
- Email OTP login flow
- JWT protected route + logout token blacklist

## Setup

### 1) Backend env
Copy example env:

```bash
cd secure-2fa-app/backend
cp .env.example .env
```

Edit `.env` and replace:
- `MONGO_URI`
- `JWT_SECRET`
- `EMAIL_USER` and `EMAIL_PASS`

> Gmail requires App Password (NOT your normal Gmail password).

### 2) Install dependencies
From project root:

```bash
cd secure-2fa-app
npm install
```

### 3) Run backend
```bash
npm start
```
Backend: http://localhost:5000

### 4) Run frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## API Flow

### Signup
1. `POST /api/auth/register` {email,password,otpMethod}
2. `POST /api/auth/verify-email` {email,otp}
3. If authenticator:
   - `POST /api/auth/setup-authenticator` {email}
   - `POST /api/auth/verify-authenticator` {email,token}

### Login
1. `POST /api/auth/login` {email,password}
2. If authenticator: `POST /api/auth/login/verify-authenticator` {email,token}
3. If email OTP: `POST /api/auth/login/verify-email` {email,otp}

