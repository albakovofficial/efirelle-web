#!/bin/bash
# Автовыкладка сайта. Запуск на сервере от root:
#   curl -fsSL https://raw.githubusercontent.com/albakovofficial/efirelle-web/main/deploy/install-autodeploy.sh | bash
#
# Как это работает:
#   1. GitHub Actions (.github/workflows/ci.yml) на каждый пуш в main собирает сайт и, если сборка прошла,
#      переносит коммит в ветку production. Сломанная сборка до сервера не доходит.
#   2. Сразу после этого Actions делает POST на https://efirelle.ru/_deploy-hook, и сервер тут же
#      сверяет production с выложенной версией; при новом коммите запускает efirelle-deploy:
#      забирает код, собирает, перезапускает службу. Адрес ничего не принимает и не раскрывает —
#      он только просит сервер свериться с GitHub, поэтому секрет не нужен; частота ограничена в nginx.
#      Страховка, если сигнал не дошёл: та же проверка по таймеру каждые 15 секунд.
#   3. После каждой выкладки efirelle-deploy заново запускает этот скрипт с --refresh, поэтому
#      изменения в настройках выкладки из репозитория применяются на сервере сами.
#
# Логи: journalctl -u efirelle-autodeploy. Выложить вручную: efirelle-deploy.
set -euo pipefail

REFRESH=false
[ "${1:-}" = "--refresh" ] && REFRESH=true

APP_DIR=/opt/efirelle-web
APP_USER=efirelle
STATE_DIR=/var/lib/efirelle

mkdir -p "$STATE_DIR"

# Файл пишется рядом и подменяется целиком: efirelle-deploy может выполняться прямо сейчас,
# а bash читает скрипт по ходу работы — перезапись на месте его бы сломала.
write_file() {
  local target=$1 mode=$2
  cat >"$target.new"
  chmod "$mode" "$target.new"
  mv -f "$target.new" "$target"
}

write_file /usr/local/bin/efirelle-deploy 755 <<EOF
#!/bin/bash
# Обновить сайт до ветки production (по умолчанию) или до указанной: efirelle-deploy [ветка]
set -euo pipefail
BRANCH=\${1:-production}
as_app() { sudo -u "$APP_USER" -H "\$@"; }
cd "$APP_DIR"
as_app git fetch --quiet --depth 1 origin "\$BRANCH"
TARGET=\$(as_app git rev-parse FETCH_HEAD)
as_app git reset --quiet --hard "\$TARGET"
as_app npm install --no-audit --no-fund
as_app env NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build
# API: сборка; миграции базы применяются при запуске службы.
if [ -d "$APP_DIR/api" ]; then
  (cd "$APP_DIR/api" && as_app npm install --no-audit --no-fund && as_app npm run build)
  systemctl restart efirelle-api 2>/dev/null || true
fi
systemctl restart efirelle-web
echo "\$TARGET" >"$STATE_DIR/deployed"
echo "Выложено: \$TARGET"
# Применить настройки выкладки из только что выложенной версии.
bash "$APP_DIR/deploy/install-autodeploy.sh" --refresh || echo "Настройки автовыкладки не обновились"
EOF

write_file /usr/local/bin/efirelle-autodeploy 755 <<EOF
#!/bin/bash
# Проверка ветки production: если там новый коммит — выкладка. Запускается таймером.
set -uo pipefail
cd "$APP_DIR" || exit 1
REMOTE=\$(sudo -u "$APP_USER" -H git ls-remote origin refs/heads/production | cut -f1)
[ -n "\$REMOTE" ] || exit 0
[ "\$REMOTE" = "\$(cat "$STATE_DIR/deployed" 2>/dev/null)" ] && exit 0
# Версия, которая уже не собралась на сервере, повторно не собирается — ждём следующий коммит.
[ "\$REMOTE" = "\$(cat "$STATE_DIR/failed" 2>/dev/null)" ] && exit 0
echo "Новая версия: \$REMOTE"
if /usr/local/bin/efirelle-deploy production; then
  rm -f "$STATE_DIR/failed"
else
  echo "\$REMOTE" >"$STATE_DIR/failed"
  echo "Выкладка \$REMOTE не удалась"
  exit 1
fi
# Пока шла сборка, мог прийти ещё коммит — сразу проверяем снова.
exec /usr/local/bin/efirelle-autodeploy
EOF

# Мгновенный запуск: nginx передаёт POST /_deploy-hook на 127.0.0.1:9100, systemd на каждое
# подключение запускает efirelle-hook — он отвечает 202 и стартует проверку новой версии.
write_file /usr/local/bin/efirelle-hook 755 <<'EOF'
#!/bin/bash
# Читаем заголовки запроса (тело не нужно) и сразу отвечаем.
while IFS= read -r -t 2 line && [ "${line%$'\r'}" != "" ]; do :; done
printf 'HTTP/1.1 202 Accepted\r\nContent-Type: text/plain\r\nContent-Length: 3\r\nConnection: close\r\n\r\nok\n'
systemctl start --no-block efirelle-autodeploy.service
EOF

write_file /etc/systemd/system/efirelle-hook.socket 644 <<EOF
[Unit]
Description=Efirelle: приём сигнала о новой версии

[Socket]
ListenStream=127.0.0.1:9100
Accept=yes
MaxConnections=4

[Install]
WantedBy=sockets.target
EOF

write_file /etc/systemd/system/efirelle-hook@.service 644 <<EOF
[Unit]
Description=Efirelle: сигнал о новой версии

[Service]
ExecStart=/usr/local/bin/efirelle-hook
StandardInput=socket
StandardOutput=socket
StandardError=journal
RuntimeMaxSec=10
EOF

write_file /etc/nginx/conf.d/efirelle-hook-limit.conf 644 <<'EOF'
limit_req_zone $binary_remote_addr zone=efirelle_hook:1m rate=10r/m;
EOF

mkdir -p /etc/nginx/snippets
write_file /etc/nginx/snippets/efirelle-deploy-hook.conf 644 <<'EOF'
location = /_deploy-hook {
    limit_except POST { deny all; }
    limit_req zone=efirelle_hook burst=5 nodelay;
    proxy_pass http://127.0.0.1:9100;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 5s;
}
EOF

# Подключаем location во все server-блоки сайта (и до, и после выпуска HTTPS).
SITE=/etc/nginx/sites-available/efirelle
if [ -f "$SITE" ] && ! grep -q efirelle-deploy-hook "$SITE"; then
  sed -i '/server_name /a\    include snippets/efirelle-deploy-hook.conf;' "$SITE"
fi

write_file /etc/systemd/system/efirelle-autodeploy.service 644 <<EOF
[Unit]
Description=Efirelle: выкладка новой версии из ветки production
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/efirelle-autodeploy
EOF

write_file /etc/systemd/system/efirelle-autodeploy.timer 644 <<EOF
[Unit]
Description=Efirelle: проверка новой версии каждые 15 секунд

[Timer]
OnBootSec=15s
OnUnitInactiveSec=15s
# Без этого systemd может откладывать срабатывание до минуты.
AccuracySec=1s

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now efirelle-hook.socket
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  echo "nginx: конфигурация с /_deploy-hook не прошла проверку — сигнал не работает, выкладка идёт по таймеру"
  nginx -t || true
fi
systemctl enable efirelle-autodeploy.timer
# restart, чтобы новый интервал применился сразу.
systemctl restart efirelle-autodeploy.timer

# Серверная часть: база, медиасервер, API, маршруты nginx (deploy/provision.sh).
bash "$APP_DIR/deploy/provision.sh" || echo "Настройка серверной части завершилась с ошибкой — см. /var/www/html/efirelle-provision.txt"

if [ "$REFRESH" = true ]; then
  exit 0
fi

systemctl start --no-block efirelle-autodeploy.service

# Служебный файл статуса первичной настройки больше не нужен, когда HTTPS уже выпущен.
if [ -d /etc/letsencrypt/live/efirelle.ru ]; then
  rm -f /var/www/html/efirelle-status.txt
fi

echo "Автовыкладка включена. Ход выкладки: journalctl -u efirelle-autodeploy -f"
