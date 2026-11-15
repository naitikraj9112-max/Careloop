# Stage 1: Build the Vite React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build production distribution bundle
RUN npm run build

# Stage 2: Serve with high-performance Nginx on Cloud Run
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Support Cloud Run dynamic $PORT environment variable (default: 8080)
ENV PORT=8080
EXPOSE 8080

CMD sh -c "sed -i 's/listen 8080;/listen '${PORT}';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
