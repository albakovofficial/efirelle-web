#!/bin/bash
# Автовыкладка сайта. Запуск на сервере от root:
#   curl -fsSL https://raw.githubusercontent.com/albakovofficial/efirelle-web/main/deploy/install-autodeploy.sh | bash
#
# Как это работает:
#   1. GitHub Actions (.github/workflows/ci.yml) на каждый пуш в main собирает сайт и, если сборка прошла,
#      переносит коммит в ветку production. Сломанная сборка до сервера не доходит.
#   2. Сервер раз в 2 минуты сверяет production с тем, что уже выложено, и при новом коммите
#      запускает efirelle-deploy: забирает код, собирает, перезапускает службу.
#
# Логи: journalctl -u efirelle-autodeploy. Выложить вручную: efirelle-deploy.
set -euo pipefail

APP_DIR=/opt/efirelle-web
APP_USER=efirelle
STATE_DIR=/var/lib/efirelle

mkdir -p "$STATE_DIR"

cat >/usr/local/bin/efirelle-deploy <<EOF
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
systemctl restart efirelle-web
echo "\$TARGET" >"$STATE_DIR/deployed"
echo "Выложено: \$TARGET"
EOF
chmod 755 /usr/local/bin/efirelle-deploy

cat >/usr/local/bin/efirelle-autodeploy <<EOF
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
EOF
chmod 755 /usr/local/bin/efirelle-autodeploy

cat >/etc/systemd/system/efirelle-autodeploy.service <<EOF
[Unit]
Description=Efirelle: выкладка новой версии из ветки production
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/efirelle-autodeploy
EOF

cat >/etc/systemd/system/efirelle-autodeploy.timer <<EOF
[Unit]
Description=Efirelle: проверка новой версии каждые 2 минуты

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now efirelle-autodeploy.timer
systemctl start --no-block efirelle-autodeploy.service

# Служебный файл статуса первичной настройки больше не нужен, когда HTTPS уже выпущен.
if [ -d /etc/letsencrypt/live/efirelle.ru ]; then
  rm -f /var/www/html/efirelle-status.txt
fi

echo "Автовыкладка включена. Ход выкладки: journalctl -u efirelle-autodeploy -f"
