# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:22-bookworm-slim AS build

# bcrypt/sharp are native modules; if no prebuilt binary matches this
# platform/Node ABI, npm falls back to compiling from source.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* vars into the client bundle at build time, so they must
# be real env vars during `npm run build` — passing them only at container
# runtime is too late, the bundle is already built by then.
ARG VITE_API_BASE_URL
# "true" = browser calls API Gateway directly (rollback switch for the /api proxy)
ARG VITE_API_DIRECT
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_META_PIXEL_ID
ARG VITE_RECAPTCHA_SITEKEY
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_DIRECT=$VITE_API_DIRECT \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_META_PIXEL_ID=$VITE_META_PIXEL_ID \
    VITE_RECAPTCHA_SITEKEY=$VITE_RECAPTCHA_SITEKEY \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL

RUN npm run build

# ---- runtime stage ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Unprivileged port: the app runs as the non-root "node" user, which can't
# bind ports below 1024. Lightsail's public endpoint maps to this port
# (containerPort in .github/workflows/deploy.yml).
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/build ./build

# Files stay root-owned (read-only for the app); the process runs as "node",
# so a compromise of the server can't modify the app or the image.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
