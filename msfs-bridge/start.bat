@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js が見つかりません。
  echo https://nodejs.org/ から「LTS」をインストールして、このファイルを再実行してください。
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 初回セットアップ: npm install を実行します…
  call npm install
  if errorlevel 1 (
    echo npm install に失敗しました。インターネット接続を確認してください。
    pause
    exit /b 1
  )
  echo.
)

echo ブリッジを起動します。停止は Ctrl+C です。
echo.
node server.js %*
echo.
if errorlevel 1 pause
