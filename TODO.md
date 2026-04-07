# Authentication Fixes - TODO
Status: **3/11 COMPLETE** (Backend ✅)

## Backend (src/backend/routes/auth.js) [3/3] ✅
- [x] 1. /login: Check user exists → "User not registered" error
- [x] 2. ADD /forgot-password: Check exists → error or send OTP  
- [x] 3. /resend-otp: Validate user exists before resend

## Frontend [0/8]
### Login.jsx [0/2]
- [ ] 1. Catch "User not registered" → toast + setError()
- [ ] 2. Test unregistered login

### Signup.jsx [0/4]
- [ ] 1. name field: onChange → /^[a-zA-Z\s]*$/ 
- [ ] 2. handleResend: setOtp(new Array(6).fill(""))
- [ ] 3. Duplicate account → ensure showToast fires
- [ ] 4. Test resend OTP clears + validates new

### ForgetPassword.jsx [0/2]
- [ ] 1. Use /forgot-password endpoint → show "not registered" toast
- [ ] 2. Test non-registered forgot password

## Final [0/1]
- [ ] Restart backend + full test all flows

**Next**: Login.jsx → catch new backend error
