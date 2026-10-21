import sys, time, json
from selenium import webdriver
from selenium.webdriver.safari.options import Options
udid, n = sys.argv[1], int(sys.argv[2])
o = Options()
o.set_capability('platformName', 'iOS')
o.set_capability('safari:useSimulator', True)
o.set_capability('safari:deviceUDID', udid)
d = webdriver.Safari(options=o)
t0 = time.time(); naplo = []
def kep(nev): d.save_screenshot(f'ki/{nev}.png')
for v, base in (('regi', 'http://localhost:8000/regi/'), ('uj', 'http://localhost:8000/uj/'), ('elo', 'https://nexusklima.hu/')):
    d.get(base); time.sleep(3)
    for i in range(1, n + 1):
        s = time.time() - t0
        d.refresh()                      # returns after load
        b = time.time() - t0
        kep(f'{v}-{i:02d}-a')            # right after load
        time.sleep(0.6); kep(f'{v}-{i:02d}-b')
        info = d.execute_script("""const p=document.querySelector('.hero-pan')||document.querySelector('.hero-kep img');
          const r=p?p.getBoundingClientRect():null; return {x:r&&Math.round(r.x), w:r&&Math.round(r.width), kesz:!!document.querySelector('.hero-kesz'), vw:innerWidth}""")
        naplo.append({'v': v, 'i': i, 'start': round(s, 2), 'betoltve': round(b, 2), **info})
        print(json.dumps(naplo[-1]), flush=True)
        time.sleep(2)
json.dump(naplo, open('ki/naplo.json', 'w'), indent=1)
d.quit()
