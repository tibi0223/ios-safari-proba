#!/usr/bin/env bash
# Mobile Safari in the iOS Simulator driven by safaridriver (WebDriver): real reloads,
# a video of the whole run, and a log of when each reload started (to cut the video).
set -u
N="${1:-12}"; mkdir -p ki
sudo safaridriver --enable || true
xcrun simctl list devices available | grep -E "iPhone 1[5-7]( |$)" | tee ki/eszkozok.txt
UDID=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
c=[(k,x) for k,v in d.items() if 'iOS' in k for x in v if x['name'] in ('iPhone 16','iPhone 17','iPhone 16 Pro','iPhone 17 Pro')]
k,x=sorted(c,key=lambda t:t[0])[-1]; print(x['udid']); print(k,x['name'],file=sys.stderr)" 2>ki/eszkoz.txt)
cat ki/eszkoz.txt
xcrun simctl boot "$UDID"; xcrun simctl bootstatus "$UDID" -b >/dev/null
python3 -m http.server 8000 >/dev/null 2>&1 &
sleep 2
xcrun simctl io "$UDID" recordVideo --codec=h264 --force ki/video.mp4 & REC=$!
sleep 2
python3 vezerel.py "$UDID" "$N" 2>&1 | tee ki/vezerel.log
sleep 2; kill -INT $REC; wait $REC 2>/dev/null
ls -la ki | head
