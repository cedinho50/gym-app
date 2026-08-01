FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV npm_config_sharp_binary_host=""
RUN sed -i s#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#g package-lock.json && npm install --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN sed -i s#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#g package-lock.json && npm install --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
