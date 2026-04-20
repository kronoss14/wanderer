# ── Stage 1: Build ──────────────────────────────────────
# We use a "multi-stage" build. This stage installs ALL dependencies
# (including devDependencies like terser and clean-css for minification),
# runs the build step, then we throw this stage away.
# Why? The final image doesn't need dev tools — smaller image = faster deploys.

FROM node:22-slim AS builder

# Set working directory inside the container.
# All following commands (COPY, RUN, etc.) happen relative to this path.
WORKDIR /app

# Copy ONLY package.json and package-lock.json first.
# Why not copy everything? Docker caches each step (layer).
# If these files haven't changed, Docker skips "npm install" on rebuild.
# This saves minutes on every rebuild where only code changed.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for the build step).
# --ignore-scripts: skip postinstall scripts that might fail in Alpine.
# ci: uses the lockfile exactly (reproducible builds), faster than "npm install".
RUN npm ci

# NOW copy the rest of the source code.
# This is after npm ci so changing a .js file doesn't re-trigger npm ci.
COPY . .

# Run the build: minifies CSS and JS files for production.
RUN npm run build


# ── Stage 2: Production ────────────────────────────────
# Fresh, clean image. Only production stuff goes here.

FROM node:22-slim

WORKDIR /app

# Copy package files again
COPY package.json package-lock.json ./

# Install ONLY production dependencies (no terser, no clean-css).
# --omit=dev: skips devDependencies.
RUN npm ci --omit=dev

# Copy the built/minified code from Stage 1.
# --from=builder: pulls files from the first stage, not from your machine.
COPY --from=builder /app/public ./public
COPY --from=builder /app/views ./views

# Copy the rest of the application code.
COPY server.js ./
COPY routes ./routes
COPY helpers ./helpers
COPY data ./data
COPY scripts ./scripts

# The app listens on port 3000. This doesn't publish the port —
# it's documentation for whoever runs the container.
EXPOSE 3000

# Set default environment
ENV NODE_ENV=production

# The command that runs when the container starts.
CMD ["node", "server.js"]
