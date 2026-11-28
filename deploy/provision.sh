#!/bin/bash
# Серверная часть Efirelle: PostgreSQL, медиасервер MediaMTX, служба API, маршруты nginx.
# Запускается от root из install-autodeploy.sh после каждой выкладки. Повторный запуск безопасен:
# уже сделанное не переделывается, пароли и настройки, которые владелец поменял вручную, не трогаются.
#
# Итоги шагов (без секретов) пишутся в /var/www/html/efirelle-provision.txt — их видно по IP сервера.
set -uo pipefail

APP_DIR=/opt/efirelle-web
APP_USER=efirelle
API_DIR=$APP_DIR/api
ENV_DIR=/etc/efirelle
API_ENV=$ENV_DIR/api.env
REPORT=/var/www/html/efirelle-provision.txt
SITE=/etc/nginx/sites-available/efirelle

mkdir -p /var/www/html "$ENV_DIR"
: >"$REPORT.new"
step() { echo "$(date -u +%FT%TZ) $*" | tee -a "$REPORT.new"; }
finish() { mv -f "$REPORT.new" "$REPORT"; }
trap finish EXIT

# --- PostgreSQL ---------------------------------------------------------------
if ! command -v psql >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -yq postgresql >/dev/null && step "PostgreSQL установлен" || step "ОШИБКА: PostgreSQL не установился"
fi
systemctl enable --now postgresql >/dev/null 2>&1

if [ ! -f "$API_ENV" ]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL && step "База efirelle создана" || step "ОШИБКА: база не создана"
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'efirelle') THEN
    CREATE ROLE efirelle LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE efirelle PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;
SELECT 'CREATE DATABASE efirelle OWNER efirelle' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'efirelle')\gexec
SQL
  sudo -u postgres psql -q -d efirelle -c "CREATE EXTENSION IF NOT EXISTS citext" >/dev/null
  umask 027
  cat >"$API_ENV" <<EOF
# Настройки API Efirelle. После правки: systemctl restart efirelle-api
NODE_ENV=production
PORT=4000
HOST=127.0.0.1
PUBLIC_URL=https://efirelle.ru
DATABASE_URL=postgres://efirelle:$DB_PASSWORD@127.0.0.1:5432/efirelle
# Эти почты при регистрации получают роль администратора (модерация жалоб).
ADMIN_EMAILS=efirelle@efirelle.ru,support@efirelle.ru
# Письма восстановления пароля. Пароль приложения для no-reply@efirelle.ru — из Яндекс 360.
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=no-reply@efirelle.ru
SMTP_PASSWORD=
SMTP_FROM=Efirelle <no-reply@efirelle.ru>
EOF
  umask 022
  chown root:"$APP_USER" "$API_ENV"
  chmod 640 "$API_ENV"
  step "Настройки API записаны в $API_ENV"
fi

# --- MediaMTX: приём эфиров по RTMP и раздача HLS ------------------------------
if [ ! -x /usr/local/bin/mediamtx ]; then
  URL=$(curl -fsS https://api.github.com/repos/bluenviron/mediamtx/releases/latest \
    | grep -o '"browser_download_url": *"[^"]*linux_amd64\.tar\.gz"' | head -n1 | cut -d'"' -f4)
  if [ -n "$URL" ] && curl -fsSL "$URL" -o /tmp/mediamtx.tar.gz && tar -xzf /tmp/mediamtx.tar.gz -C /usr/local/bin mediamtx; then
    step "MediaMTX установлен: $(basename "$URL")"
  else
    step "ОШИБКА: MediaMTX не скачался"
  fi
  rm -f /tmp/mediamtx.tar.gz
fi
id -u mediamtx >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin mediamtx

mkdir -p /etc/mediamtx
cat >/etc/mediamtx/mediamtx.yml.new <<'EOF'
# MediaMTX для Efirelle. Автор публикует rtmp://efirelle.ru/live с ключом «<канал>?key=<секрет>»,
# зрители смотрят https://efirelle.ru/hls/live/<канал>/index.m3u8. Ключ проверяет API.
logLevel: info
api: yes
apiAddress: 127.0.0.1:9997
rtsp: no
webrtc: no
srt: no
rtmp: yes
rtmpAddress: :1935
hls: yes
hlsAddress: 127.0.0.1:8888
hlsAlwaysRemux: yes
hlsVariant: lowLatency
hlsSegmentCount: 7
hlsSegmentDuration: 1s
hlsPartDuration: 200ms
authMethod: http
authHTTPAddress: http://127.0.0.1:4000/api/internal/media/auth
authHTTPExclude:
  - action: api
  - action: metrics
  - action: pprof
paths:
  all_others:
    runOnReady: 'curl -fsS -X POST "http://127.0.0.1:4000/api/internal/media/ready?path=$MTX_PATH"'
    runOnNotReady: 'curl -fsS -X POST "http://127.0.0.1:4000/api/internal/media/not-ready?path=$MTX_PATH"'
EOF
if ! cmp -s /etc/mediamtx/mediamtx.yml.new /etc/mediamtx/mediamtx.yml; then
  mv -f /etc/mediamtx/mediamtx.yml.new /etc/mediamtx/mediamtx.yml
  MEDIAMTX_CHANGED=1
else
  rm -f /etc/mediamtx/mediamtx.yml.new
fi

cat >/etc/systemd/system/mediamtx.service <<'EOF'
[Unit]
Description=Efirelle: медиасервер MediaMTX (приём и раздача эфиров)
After=network-online.target efirelle-api.service

[Service]
User=mediamtx
ExecStart=/usr/local/bin/mediamtx /etc/mediamtx/mediamtx.yml
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# --- API ---------------------------------------------------------------------
cat >/etc/systemd/system/efirelle-api.service <<EOF
[Unit]
Description=Efirelle: API (аккаунты, чат, эфиры)
After=network-online.target postgresql.service
Requires=postgresql.service

[Service]
User=$APP_USER
WorkingDirectory=$API_DIR
EnvironmentFile=$API_ENV
ExecStart=/usr/bin/node $API_DIR/dist/src/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Первая выкладка с API: старый efirelle-deploy его ещё не собирал.
if [ -d "$API_DIR" ] && [ ! -f "$API_DIR/dist/src/server.js" ]; then
  (cd "$API_DIR" && sudo -u "$APP_USER" -H npm install --no-audit --no-fund && sudo -u "$APP_USER" -H npm run build) >/dev/null 2>&1 \
    && step "API собран" || step "ОШИБКА: API не собрался"
fi

systemctl daemon-reload
systemctl enable efirelle-api mediamtx >/dev/null 2>&1
systemctl is-active --quiet efirelle-api || systemctl start efirelle-api
if [ "${MEDIAMTX_CHANGED:-0}" = 1 ]; then systemctl restart mediamtx; else systemctl is-active --quiet mediamtx || systemctl start mediamtx; fi

# --- nginx: /api, WebSocket чата, видео -----------------------------------------
cat >/etc/nginx/conf.d/efirelle-api-map.conf <<'EOF'
map $http_upgrade $efirelle_connection {
    default upgrade;
    ''      close;
}
EOF
cat >/etc/nginx/snippets/efirelle-api.conf <<'EOF'
# Служебные адреса медиасервера — только изнутри сервера.
location ^~ /api/internal/ {
    return 404;
}
location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $efirelle_connection;
    proxy_read_timeout 1h;
    client_max_body_size 64k;
}
location /hls/ {
    proxy_pass http://127.0.0.1:8888/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_buffering off;
}
EOF
if [ -f "$SITE" ] && ! grep -q efirelle-api.conf "$SITE"; then
  sed -i '/server_name /a\    include snippets/efirelle-api.conf;' "$SITE"
fi
if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx
else
  step "ОШИБКА: конфигурация nginx не прошла проверку"
fi

# --- Итог ----------------------------------------------------------------------
for unit in postgresql efirelle-api mediamtx efirelle-web nginx; do
  step "$unit: $(systemctl is-active "$unit")"
done
HEALTH=$(curl -fsS -m 5 http://127.0.0.1:4000/api/health 2>/dev/null || echo нет)
step "API /api/health: $HEALTH"
step "MediaMTX API: $(curl -fsS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:9997/v3/paths/list 2>/dev/null || echo нет)"
grep -q '^SMTP_PASSWORD=.\+' "$API_ENV" && step "Почта: SMTP настроен" || step "Почта: SMTP_PASSWORD не задан — восстановление пароля по почте выключено"
