#!/bin/bash
# Первичная настройка сервера Efirelle (Ubuntu 24.04). Передаётся в User data при создании сервера.
# Ставит Node.js 22 и nginx, собирает сайт, запускает его как службу и выпускает HTTPS после того,
# как домен начнёт указывать на сервер. Ход работы пишется в /var/www/html/efirelle-status.txt.
set -uo pipefail

DOMAIN=efirelle.ru
REPO=https://github.com/albakovofficial/efirelle-web.git
APP_DIR=/opt/efirelle-web
APP_USER=efirelle
PORT=3000
LOG=/var/log/efirelle-setup.log
STATUS=/var/www/html/efirelle-status.txt

exec >>"$LOG" 2>&1
mkdir -p /var/www/html
status() { echo "$(date -u +%FT%TZ) $*" >>"$STATUS"; }
fail() { status "ОШИБКА: $*"; tail -n 60 "$LOG" | sed 's/^/  | /' >>"$STATUS"; exit 1; }

status "старт"

# 2 ГБ swap: сборке Next.js на 1 ГБ RAM без него не хватает памяти.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile \
    && echo '/swapfile none swap sw 0 0' >>/etc/fstab || fail "swap"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -q || fail "apt update"
apt-get install -yq ca-certificates curl git nginx certbot python3-certbot-nginx dnsutils || fail "пакеты"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || fail "репозиторий Node.js"
apt-get install -yq nodejs || fail "Node.js"
status "пакеты установлены, node $(node -v)"

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

# Скрипт обновления: им же пользуемся при каждой следующей выкладке.
cat >/usr/local/bin/efirelle-deploy <<EOF
#!/bin/bash
# Обновить сайт до последней версии из GitHub: efirelle-deploy
set -euo pipefail
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --depth 1 "$REPO" "$APP_DIR"
  chown -R "$APP_USER": "$APP_DIR"
fi
cd "$APP_DIR"
sudo -u "$APP_USER" -H git pull --ff-only
sudo -u "$APP_USER" -H npm install --no-audit --no-fund
sudo -u "$APP_USER" -H env NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build
systemctl restart efirelle-web 2>/dev/null || true
EOF
chmod 755 /usr/local/bin/efirelle-deploy

cat >/etc/systemd/system/efirelle-web.service <<EOF
[Unit]
Description=Efirelle web (Next.js)
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/node $APP_DIR/node_modules/next/dist/bin/next start -p $PORT -H 127.0.0.1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

status "сборка сайта (несколько минут)"
/usr/local/bin/efirelle-deploy || fail "сборка"
systemctl daemon-reload
systemctl enable --now efirelle-web || fail "запуск службы"
status "сайт собран и запущен"

cat >/etc/nginx/sites-available/efirelle <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf /etc/nginx/sites-available/efirelle /etc/nginx/sites-enabled/efirelle
nginx -t && systemctl reload nginx || fail "nginx"
status "nginx настроен, жду DNS для $DOMAIN"

# HTTPS: ждём (до 6 часов), пока домен и www укажут на этот сервер.
PUBLIC_IP=$(curl -fsS https://api.ipify.org)
for _ in $(seq 1 720); do
  ROOT_IP=$(dig +short A "$DOMAIN" @8.8.8.8 | tail -n1)
  WWW_IP=$(dig +short A "www.$DOMAIN" @8.8.8.8 | tail -n1)
  [ "$ROOT_IP" = "$PUBLIC_IP" ] && [ "$WWW_IP" = "$PUBLIC_IP" ] && break
  sleep 30
done
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect || fail "сертификат HTTPS"
status "готово: https://$DOMAIN"
