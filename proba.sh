#!/usr/bin/env bash
# Reload a page many times in the iOS Simulator's Mobile Safari and capture the hero.
# Variants: regi = the 2026-10-20 13:16 package (known bad on iPhone), uj = the current
# package, both served from this runner; elo = the live site.
set -u
N="${1:-12}"
mkdir -p ki
xcrun simctl list runtimes | tee ki/runtimes.txt
UDID=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
c=[(k,x) for k,v in d.items() if 'iOS' in k for x in v if x['name'].startswith('iPhone') and 'Pro Max' not in x['name'] and 'Plus' not in x['name']]
k,x=sorted(c,key=lambda t:t[0])[-1]
print(x['udid']); print(k, x['name'], file=sys.stderr)" 2>ki/eszkoz.txt)
cat ki/eszkoz.txt
xcrun simctl boot "$UDID"; xcrun simctl bootstatus "$UDID" -b >/dev/null
python3 -m http.server 8000 >/dev/null 2>&1 &
sleep 2
xcrun simctl openurl "$UDID" "http://localhost:8000/regi/404.html"; sleep 8
for v in regi uj elo; do
  case $v in elo) base="https://nexusklima.hu/";; *) base="http://localhost:8000/$v/";; esac
  xcrun simctl io "$UDID" recordVideo --codec=h264 --force "ki/$v.mp4" & REC=$!
  sleep 1
  for i in $(seq 1 "$N"); do
    xcrun simctl openurl "$UDID" "${base}?r=$v$i"
    s0=$(python3 -c 'import time;print(time.time())')
    for t in 0.5 1.0 2.0 4.0; do
      python3 -c "import time;t0=$s0;time.sleep(max(0,t0+$t-time.time()))"
      xcrun simctl io "$UDID" screenshot "ki/$v-$(printf %02d $i)-$t.png" >/dev/null 2>&1
    done
    sleep 1
  done
  kill -INT $REC; wait $REC 2>/dev/null
done
ls ki | wc -l
