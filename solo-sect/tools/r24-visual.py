#!/usr/bin/env python3
"""Two real browser panels: founding choice and a fixed stalled construction site."""
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
out = root / 'artifacts/r24'
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
    founding = page.locator('#founding-action').inner_text()
    assert '上門拜師' in founding and '覬覦糧財' in founding
    images = {'founding': page.locator('#founding-action').screenshot()}
    page.evaluate('''async () => {
      const { foundHermitageSect } = await import('./src/sect.mjs');
      const S = window.__sect.S;
      const r = foundHermitageSect(S, 'single'); if (!r.ok) throw Error(r.why);
      S.fac.hall.site = { need: {wood: 0, stone: 4}, delivered: {wood: 0, stone: 1},
        reserved: {wood: 0, stone: 0}, work: 0, workNeed: 100, paused: false };
      window.__sect.panel(); S.t += 600; window.__sect.panel();
    }''')
    page.locator('[data-rail="sect"]').click()
    page.evaluate("document.querySelector('[data-rail-tab=sect]').classList.add('active')")
    stalled = page.locator('#build').inner_text()
    assert '工地停工一日' in stalled and '缺石 3' in stalled and '職責／優先設定' in stalled
    page.locator('#build').locator('xpath=preceding-sibling::h2[1]').click()
    page.locator('.stalled-site').scroll_into_view_if_needed()
    images['stalled'] = page.locator('.stalled-site').screenshot()
    labels = ('founding', 'stalled') if args.seed % 2 else ('stalled', 'founding')
    for label, state in zip(('A', 'B'), labels):
        (out / f'blind-{label}.png').write_bytes(images[state])
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': dict(zip(('A', 'B'), labels)),
    'method': 'normal UI start, real founding action, fixed missing-stone site and one-day observation',
    'foundingText': founding, 'stalledText': stalled}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png']}, ensure_ascii=False))
