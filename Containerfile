FROM docker.io/library/node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm test && pnpm build && mkdir -p /tmp/app-data && touch /tmp/app-data/.keep

FROM gcr.io/distroless/nodejs22-debian13:nonroot
WORKDIR /app
COPY server.mjs healthcheck.mjs ./
COPY server/store.mjs ./server/store.mjs
COPY --from=build /app/dist ./dist
COPY --from=build --chown=65532:65532 /tmp/app-data /data
ENV APP_DB_PATH=/data/app.sqlite
ENV HOST=0.0.0.0
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "healthcheck.mjs"]
CMD ["server.mjs"]
