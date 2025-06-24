# DoramaFlix Railway Deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install --only=production
RUN cd backend && npm install --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]