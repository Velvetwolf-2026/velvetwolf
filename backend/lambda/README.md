# Lambda Backend

This folder contains the Lambda-backed auth API for the project.

Available routes:
- `/`
- `/auth/signup`
- `/auth/login`
- `/auth/resend-otp`
- `/auth/forgot-password`
- `/auth/verify-otp`

Not migrated yet:
- Google OAuth routes

Local usage:
- `npm run lambda:dev` starts the Lambda-compatible dev server on `LAMBDA_PORT` or `5001`

Recommended next steps:
1. Add runtime secrets in `backend/lambda/.env` or deployment environment variables.
2. Add infrastructure deployment for IAM policies and API Gateway domains.
3. Point `VITE_API_BASE_URL` to the API Gateway URL after deployment.
