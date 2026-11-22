#!/bin/bash
# 双击我打开归档网页（macOS）
cd "$(dirname "$0")" || exit 1
P="index.html"
if [ ! -f "$P" ]; then echo "没有找到 index.html"; exit 1; fi
for app in "Google Chrome" "Microsoft Edge" "Safari"; do
  if [ -d "/Applications/$app.app" ]; then
    open -a "$app" "$P" && exit 0
  fi
done
open "$P"
