FROM node:20-alpine AS build

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:8080/api
ARG REACT_APP_GOOGLE_OAUTH_CLIENT_ID=
ARG REACT_APP_DEMO_MODE=false

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_GOOGLE_OAUTH_CLIENT_ID=${REACT_APP_GOOGLE_OAUTH_CLIENT_ID}
ENV REACT_APP_DEMO_MODE=${REACT_APP_DEMO_MODE}

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
