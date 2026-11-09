# Isolated TatNet build. Only public Rinlo files and compiled Auth QA client are shipped.
FROM node:24-alpine AS qa-build
WORKDIR /src
COPY neon/package.json neon/tsconfig.json ./neon/
COPY neon/client ./neon/client
RUN mkdir -p rinlo2 && cd neon && npm install --no-package-lock --ignore-scripts --no-audit --no-fund && npm run build:browser

FROM node:24-alpine
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
WORKDIR /app
RUN mkdir -p /app/public/rinlo2 && chown -R node:node /app
COPY --chown=node:node tatnet/server.mjs /app/server.mjs
COPY --chown=node:node rinlo2/ /app/public/rinlo2/
COPY --chown=node:node *.js *.html *.svg *.webmanifest /app/public/
COPY --chown=node:node tatnet/offline-notice.js /app/public/tatnet-offline-notice.js
COPY --from=qa-build --chown=node:node /src/rinlo2/neon-auth-qa.bundle.js /app/public/rinlo2/neon-auth-qa.bundle.js
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","/app/server.mjs"]
