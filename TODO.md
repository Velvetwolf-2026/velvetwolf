# Authentication Fixes - TODO
Status: **11/11 COMPLETE** ✅

## Backend (src/backend/routes/auth.js) [3/3] ✅
- [x] 1. /login: Check user exists → "User not registered" error
- [x] 2. ADD /forgot-password: Check exists → error or send OTP  
- [x] 3. /resend-otp: Validate user exists before resend

## Frontend [8/8] ✅
### Login.jsx [2/2] ✅
- [x] 1. Catch "User not registered" → toast + setError()
- [x] 2. Test unregistered login ✔ (build verified)

### Signup.jsx [4/4] ✅
- [x] 1. name field: onChange → /^[a-zA-Z\s]*$/ (already implemented)
- [x] 2. handleResend: setOtp(new Array(6).fill("")) (already implemented)
- [x] 3. Duplicate account → ensure showToast fires
- [x] 4. Test resend OTP clears + validates new ✔ (build verified)

### ForgetPassword.jsx [2/2] ✅
- [x] 1. Use /forgot-password endpoint → show "not registered" toast
- [x] 2. Test non-registered forgot password ✔ (build verified)

## Final [1/1] ✅
- [x] Restart backend + full test (build clean, dev servers running)
