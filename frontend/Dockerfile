# syntax=docker/dockerfile:1

FROM node:22.23.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_BASE_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
RUN npm run build

FROM nginx:1.30.3-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
