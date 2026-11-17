import re, pathlib
p = pathlib.Path('index.html'); s = p.read_text(encoding='utf-8')
s = s.replace('content="width=device-width, initial-scale=1"', 'content="width=device-width, initial-scale=1, viewport-fit=cover"')
if 'assets/mobile.css' not in s:
    s = s.replace('<link rel="stylesheet" href="assets/style.css">', '<link rel="stylesheet" href="assets/style.css">\n<link rel="stylesheet" href="assets/mobile.css">', 1)
if 'assets/mobile.js' not in s:
    s = re.sub(r'(<script[^>]*src="assets/study\.js"[^>]*></script>)', r'\1\n<script src="assets/mobile.js"></script>', s, count=1)
import hashlib
for f in ('mobile.css','mobile.js'):
    v = hashlib.md5(pathlib.Path('assets/'+f).read_bytes()).hexdigest()[:8]
    s = re.sub(r'assets/'+re.escape(f)+r'(\?v=[0-9a-f]+)?"', 'assets/'+f+'?v='+v+'"', s)
assert 'assets/mobile.css' in s and 'assets/mobile.js' in s
p.write_text(s, encoding='utf-8'); print('ok')
