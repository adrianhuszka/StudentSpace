FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/StudentSpace ./dist/StudentSpace
COPY --from=build /app/package*.json ./
COPY --from=build /app/scripts ./scripts
RUN npm ci --omit=dev
EXPOSE 4000
CMD ["node", "dist/StudentSpace/server/server.mjs"]
