#!/usr/bin/env python3
"""Real UI blind pair: empty produce sale, then witnessed true delivery."""
import argparse
import functools
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--seed', type=int, default=17)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'artifacts/r25'
out.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *values):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script(f'Date.now = () => {args.seed};')
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.evaluate('window.__sect.freeze = true')
    page.locator('[data-rail="sect"]').click()
    page.evaluate('''async () => {
      const { foundHermitageSect } = await import('./src/sect.mjs');
      const { market } = await import('./src/economy.mjs');
      const s = window.__sect.S;
      const r = foundHermitageSect(s, 'single'); if (!r.ok) throw Error(r.why);
      s.fac.veg.stage = 1; s.res.veg = 0; s.res.herb = 0;
      market(s); s.day = 6; market(s); window.__sect.panel();
    }''')
    empty = page.locator('#rumors').inner_text()
    assert '山產行商' not in empty, empty
    images = {'empty': page.locator('#rumors').screenshot()}
    page.evaluate('''async () => {
      const { market } = await import('./src/economy.mjs');
      const s = window.__sect.S;
      s.res.veg = 10; s.day = 11; market(s); window.__sect.panel();
    }''')
    sold = page.locator('#rumors').inner_text()
    assert '山產行商' in sold and '收走菜' in sold and '香火錢' in sold
    images['sold'] = page.locator('#rumors').screenshot()
    labels = ('empty', 'sold') if args.seed % 2 else ('sold', 'empty')
    for label, state in zip(('A', 'B'), labels):
        (out / f'blind-{label}.png').write_bytes(images[state])
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': dict(zip(('A', 'B'), labels)),
    'method': 'normal UI start and founding; fixed market day and true stock; real market() and rumorHtml()',
    'emptyText': empty, 'soldText': sold}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png']}, ensure_ascii=False))
