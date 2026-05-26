# Stage 1: Build the Angular application
FROM node:20-alpine AS build-stage
WORKDIR /app

# Copy package files and install dependencies
# Using 'npm ci' ensures a clean, reproducible install from package-lock.json
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application for production
RUN npm run build --configuration=production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from build-stage to Nginx public folder
COPY --from=build-stage /app/dist/boombox/browser /usr/share/nginx/html

# Copy custom Nginx configuration if needed (optional)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
