#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Recon-X2025/coheron-connect-new.git"
APP_DIR="$HOME/CoheronERP"

echo "=== CoheronERP Deployment ==="

# 1. Install Docker if not present
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  echo "Docker installed. If this is your first install, log out and back in, then re-run this script."
  exit 0
fi

# 2. Ensure Docker Compose is available
if ! docker compose version &>/dev/null; then
  echo "ERROR: docker compose plugin not found. Install it and re-run."
  exit 1
fi

# 3. Clone or pull repo
if [ -d "$APP_DIR/.git" ]; then
  echo "Pulling latest code..."
  git -C "$APP_DIR" pull --ff-only
else
  echo "Cloning repo..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# 4. Set up .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "No .env file found — created from .env.example."
  echo "Please provide the following values:"
  echo ""

  read -rp "MONGO_URI (MongoDB Atlas connection string): " MONGO_URI
  read -rp "JWT_SECRET (or press Enter to auto-generate): " JWT_SECRET
  read -rp "Domain name for SSL (e.g. erp.yourcompany.com, or press Enter for IP-only): " DOMAIN

  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT_SECRET."
  fi

  FIELD_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "Generated FIELD_ENCRYPTION_KEY."

  sed -i "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  sed -i "s|^FIELD_ENCRYPTION_KEY=.*|FIELD_ENCRYPTION_KEY=$FIELD_ENCRYPTION_KEY|" .env

  if [ -n "$DOMAIN" ]; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env
    # Write Caddyfile for automatic SSL
    cat > Caddyfile <<CADDYEOF
$DOMAIN {
    reverse_proxy coheron-erp:3000
}
CADDYEOF
    echo "Caddy configured for SSL on $DOMAIN"
  fi

  echo ".env configured."
fi

# 5. Build and start
echo "Building and starting containers..."
if [ -f Caddyfile ]; then
  # Start with Caddy reverse proxy for SSL
  docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
else
  docker compose up -d --build
fi

# 6. Wait for health check
echo "Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health &>/dev/null; then
    echo "Health check passed!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Health check not responding yet. Check logs with: docker compose logs"
  fi
  sleep 2
done

# 7. Seed database
echo ""
read -rp "Seed database with demo data? (y/N): " SEED
if [[ "$SEED" =~ ^[Yy] ]]; then
  echo "Seeding database..."
  docker compose exec coheron-erp node dist/database/init-mongodb.js
  echo "Database seeded!"
fi

# 8. Print access info
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo ""
echo "=== Deployment Complete ==="
if [ -f Caddyfile ]; then
  DOMAIN_NAME=$(head -1 Caddyfile | awk '{print $1}')
  echo "Access CoheronERP at: https://$DOMAIN_NAME"
else
  echo "Access CoheronERP at: http://$IP"
fi
echo ""
echo "Default login:"
echo "  Email:    admin@coheron.com"
echo "  Password: Coheron@2025!"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f    # view logs"
echo "  docker compose restart    # restart"
echo "  docker compose down       # stop"
