FROM node:24.22.1-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.21.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@monkeytype/frontend --filter=@monkeytype/server

FROM node:24.22.1-slim
WORKDIR /app
COPY --from=build /app/server/dist/index.cjs ./server.cjs
COPY --from=build /app/frontend/dist ./frontend/dist
RUN mkdir /data && chown node:node /data
ENV DATA_DIR=/data NODE_ENV=production
VOLUME /data
USER node
EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=3s CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 5005) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.cjs"]
