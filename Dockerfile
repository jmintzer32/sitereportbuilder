# Use Node.js 20 as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment variable to production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
