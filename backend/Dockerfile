# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install all dependencies (including devDependencies for testing/building if needed)
RUN npm install

# Copy source code
COPY . .

# --- Production Stage ---
FROM node:20-alpine
WORKDIR /usr/src/app

# Set env to production
ENV NODE_ENV=production

# Copy package configurations
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built code / required source files from builder stage
COPY --from=builder /usr/src/app/src ./src

# Expose API port
EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]
