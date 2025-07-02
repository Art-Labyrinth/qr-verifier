# Multi-stage build To optimize the size of the image
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# Production stage with OpenResty
FROM openresty/openresty:1.21.4.3-alpine AS production

RUN apk add --no-cache \
    curl \
    tzdata

RUN addgroup -g 1001 -S qrverifier && \
    adduser -S qrverifier -u 1001

COPY --from=builder /app/dist /usr/local/openresty/nginx/html

COPY docker/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx /tmp/nginx_client_body /tmp/nginx_proxy /tmp/nginx_fastcgi /tmp/nginx_uwsgi /tmp/nginx_scgi \
    && chown -R qrverifier:qrverifier /var/log/nginx /var/cache/nginx /tmp/nginx /tmp/nginx_client_body /tmp/nginx_proxy /tmp/nginx_fastcgi /tmp/nginx_uwsgi /tmp/nginx_scgi \
    && chown -R qrverifier:qrverifier /usr/local/openresty/nginx/html

# USER qrverifier

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["openresty", "-g", "daemon off;"]
