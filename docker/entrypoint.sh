#!/bin/sh
set -e

# Function for logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting QR Verifier application..."

# Check the nginx configuration
log "Testing nginx configuration..."
openresty -t

if [ $? -ne 0 ]; then
    log "ERROR: nginx configuration test failed"
    exit 1
fi

log "nginx configuration is valid"

# Create the necessary directors if they are not
mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx

# Establish the correct access rights
chmod 755 /var/log/nginx /var/cache/nginx /tmp/nginx

# We check the existence of static files
if [ ! -f "/usr/local/openresty/nginx/html/index.html" ]; then
    log "ERROR: Static files not found. Build may have failed."
    exit 1
fi

log "Static files found"

# We display information about versions
log "OpenResty version: $(openresty -v 2>&1)"
log "Nginx user: $(whoami)"

# We display variable environment for debugging (without secrets)
log "Environment variables:"
env | grep -E '^(NODE_ENV|PORT|API_URL)' | sort || true

log "Starting OpenResty..."

# We transfer the management of the main process
exec "$@"
