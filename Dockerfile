FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Set WORKDIR *before* copying files
WORKDIR /app

# 2. Copy your package configuration files first
COPY package.json pnpm-lock.yaml ./

FROM base AS prod-deps
# Installs only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
# Installs all dependencies (including devDependencies needed for building)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 3. Copy source code strictly into the build stage
COPY . .
RUN pnpm run build

FROM base
# Copy node_modules from the prod-deps stage
COPY --from=prod-deps /app/node_modules /app/node_modules
# Copy compiled output from the build stage
COPY --from=build /app/dist /app/dist

# If your runtime needs the migrations folder, copy it here
COPY migrations ./migrations 

EXPOSE 3000

CMD ["pnpm", "start"]