FROM node:22-alpine

WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app
COPY . .

# Build
RUN npm run build

# Run
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
