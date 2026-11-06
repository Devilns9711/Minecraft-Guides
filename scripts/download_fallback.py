import concurrent.futures
import os
import struct
import urllib.request
import urllib.error

ROOT = r'D:\VS Code\Projects\minecraft-guides'
ICONS = os.path.join(ROOT, 'public', 'icons')
ids = [l.split('\t')[0] for l in open(os.path.join(ROOT, 'scripts', 'cache', 'gap_report.txt'), encoding='utf-8').read().splitlines()]
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}


def get(i):
    url = f'https://minecraftitemids.com/item/{i}.png'
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if data[:8] != b'\x89PNG\r\n\x1a\n':
                return i, 'notpng'
            w, h = struct.unpack('>II', data[16:24])
            if w < 16 or h < 16:
                return i, f'small {w}x{h}'
            with open(os.path.join(ICONS, i + '.png'), 'wb') as f:
                f.write(data)
            return i, f'ok {w}x{h}'
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return i, '404'
        except Exception:
            pass
    return i, 'err'


res = []
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    for out in ex.map(get, ids):
        res.append(out)

ok = [r for r in res if r[1].startswith('ok')]
print('downloaded:', len(ok))
for r in ok:
    print(' ', r[0], r[1])
print('\nstill missing:', len(res) - len(ok))
with open(os.path.join(ROOT, 'scripts', 'cache', 'gap_remaining.txt'), 'w', encoding='utf-8') as f:
    for i, st in res:
        if not st.startswith('ok'):
            f.write(i + '\n')
