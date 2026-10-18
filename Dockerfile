FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy application source, unified data stores, and Firebase configuration
COPY . .

# Build frontend (Vite) and backend server bundle (esbuild)
RUN npm run build

# Cloud Run injects PORT (defaults to 3000 locally or 8080 on Cloud Run)
ENV NODE_ENV=production
EXPOSE 3000
EXPOSE 8080

CMD ["npm", "start"]
