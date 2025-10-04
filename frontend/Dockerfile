FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Run dev server (accessible from host)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
