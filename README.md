# VelvetWolf

Frontend is powered by Vite and React.

## Scripts
- `npm run dev` starts the frontend dev server
- `npm run lambda:dev` starts the Lambda-compatible local backend on port `5001` by default
- `npm run build` builds the frontend

## Backend env
Set the required Lambda backend variables in `backend/lambda/.env` or in your deployment environment.

Required keys:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `REGION`
- `ACCESS_KEY`
- `SECRET_KEY`
- `EMAIL_FROM`
- `FRONTEND_URL`
