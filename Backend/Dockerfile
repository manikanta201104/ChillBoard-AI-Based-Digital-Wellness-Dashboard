# Dockerfile
# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy all source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the app port
EXPOSE 5000

# Start the backend in production mode
CMD ["npm", "start"]
