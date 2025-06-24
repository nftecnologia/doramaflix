# DoramaFlix Railway Deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies including Prisma CLI
RUN npm init -y
RUN npm install express cors bcrypt jsonwebtoken multer @vercel/blob @prisma/client prisma --save

# Copy Prisma schema first
COPY backend/prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy backend server files
COPY backend/server.js ./
COPY backend/admin-routes.js ./
COPY backend/upload-routes.js ./
COPY backend/src/ ./src/

# Expose port
EXPOSE $PORT

# Start the application
CMD ["node", "server.js"]