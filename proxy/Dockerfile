FROM nginx:1.27-alpine

# Copy Nginx config from repo root
COPY proxy/nginx.conf /etc/nginx/nginx.conf

# Bake certs into the image and set secure permissions
RUN set -eux; \
    mkdir -p /etc/nginx/certs

# Copy certificates directory (works even if empty) from repo root
COPY certs/ /etc/nginx/certs/

# Ensure nginx worker can read private keys (group-readable), but not world-readable
RUN set -eux; \
    chown -R root:nginx /etc/nginx/certs; \
    chmod 644 /etc/nginx/certs/*.crt || true; \
    chmod 640 /etc/nginx/certs/*.key || true; \
    chmod 644 /etc/nginx/nginx.conf

# Copy custom entrypoint shim and ensure it is executable from repo root
COPY proxy/docker-entrypoint0.sh /docker-entrypoint0.sh
RUN chmod +x /docker-entrypoint0.sh

# ENTRYPOINT ["/docker-entrypoint0.sh"]

# CMD ["nginx", "-g", "daemon off;"]
