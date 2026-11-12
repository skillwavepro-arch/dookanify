#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 1. Building production web bundle (npm run build)..."
rm -rf "$ROOT_DIR/public/APK_DOWNLOAD" "$ROOT_DIR/public/EXE_DOWNLOAD"
npm run build

echo "==> 2. Packaging & Signing Real Android Debug APK (v1 + v2 APK Sig Block 42) and Windows PC .EXE..."
python3 "$ROOT_DIR/android/package_apk_and_exe.py"

echo "==> 3. Verifying generated User App .APK, Developer/Admin App .APK, Windows .EXE, and Run-Dookanify-PC.bat outputs (> 1 MB)..."
ls -lh \
  "$ROOT_DIR/.build-outputs/app-debug.apk" \
  "$ROOT_DIR/.build-outputs/user-app.apk" \
  "$ROOT_DIR/.build-outputs/developer-app.apk" \
  "$ROOT_DIR/.build-outputs/admin-app.apk" \
  "$ROOT_DIR/.build-outputs/app-debug.exe" \
  "$ROOT_DIR/.build-outputs/Run-Dookanify-PC.bat" \
  "$ROOT_DIR/APK_DOWNLOAD/app-debug.apk" \
  "$ROOT_DIR/APK_DOWNLOAD/debugapp.apk" \
  "$ROOT_DIR/APK_DOWNLOAD/user-app.apk" \
  "$ROOT_DIR/APK_DOWNLOAD/developer-app.apk" \
  "$ROOT_DIR/APK_DOWNLOAD/admin-app.apk" \
  "$ROOT_DIR/APK_DOWNLOAD/app-debug.exe" \
  "$ROOT_DIR/APK_DOWNLOAD/Dookanify-Setup.exe" \
  "$ROOT_DIR/APK_DOWNLOAD/Run-Dookanify-PC.bat" \
  "$ROOT_DIR/EXE_DOWNLOAD/app-debug.exe" \
  "$ROOT_DIR/EXE_DOWNLOAD/Run-Dookanify-PC.bat"

