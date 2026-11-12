#!/bin/sh
# 新しいバージョン番号（JST日時）を app.js / index.html (?v=) / version.json に書き込む。
# 公開前に毎回実行してください:  ./bump-version.sh && git commit -am "..." && git push
set -e
cd "$(dirname "$0")"
V=$(TZ=Asia/Tokyo date +%Y.%m.%d-%H%M)
sed -i.bak -E "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$V'/" app.js
sed -i.bak -E "s/\?v=[0-9.]+-[0-9]+/?v=$V/g" index.html
printf '{"version": "%s"}\n' "$V" > version.json
rm -f app.js.bak index.html.bak
echo "version: $V"
