# DoramaFlix Railway Deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install basic dependencies for server.js
RUN npm init -y
RUN npm install express cors bcrypt jsonwebtoken multer @vercel/blob @prisma/client --save

# Copy backend server files
COPY backend/server.js ./
COPY backend/admin-routes.js ./
COPY backend/upload-routes.js ./
COPY backend/src/ ./src/
COPY backend/.env* ./

# Expose port
EXPOSE $PORT

# Start the application
CMD ["node", "server.js"]