# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the React application (compiles to dist/)
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
