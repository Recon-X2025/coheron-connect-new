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

  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT_SECRET."
  fi

  sed -i "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  echo ".env configured."
fi

# 5. Build and start
echo "Building and starting container..."
docker compose up -d --build

# 6. Wait for health check
echo "Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost/health &>/dev/null; then
    echo "Health check passed!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Health check failed after 30 attempts. Check logs with: docker compose logs"
    exit 1
  fi
  sleep 2
done

# 7. Print access info
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo ""
echo "=== Deployment Complete ==="
echo "Access CoheronERP at: http://$IP"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f    # view logs"
echo "  docker compose restart    # restart"
echo "  docker compose down       # stop"
