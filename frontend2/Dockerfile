# Use lightweight Node.js image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Output will be in /app/dist
