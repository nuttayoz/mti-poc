FROM oven/bun:1.3.10 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1.3.10 AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3900
ENV GOOGLE_TOKEN_STORAGE_PATH=/app/.tokens/google-oauth.json

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/.tokens

EXPOSE 3900

CMD ["bun", "run", "start"]
