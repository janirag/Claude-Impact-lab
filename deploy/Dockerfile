# Build context is the repo root: the web build copies ../prototype/index.html into public/.
FROM node:22-alpine
WORKDIR /app
COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci
COPY prototype prototype
COPY web web
RUN cd web && npm run build
WORKDIR /app/web
ENV NODE_ENV=production PORT=3000 CLAWD_DATA_DIR=/data
EXPOSE 3000
CMD ["npm", "start"]
