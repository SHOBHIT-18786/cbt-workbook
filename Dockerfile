FROM node:lts-alpine AS base

# Set working directory
WORKDIR /app

# Create a non-root user to run the application
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nodeuser \
    && chown -R nodeuser:nodejs /app


# Install production dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage for CSS
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run buildcss

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY . .

# Make uploads directory writable by the nodeuser
RUN mkdir -p uploads && chown -R nodeuser:nodejs uploads

# Set secure permissions
RUN chmod -R 755 /app

# Switch to non-root user
USER nodeuser

# Expose the port the app runs on
EXPOSE 3000

# Command to run migrations and then the application
CMD ["sh", "-c", "npm run migrate && node --env-file=.env server.js"]
