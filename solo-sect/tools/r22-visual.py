#!/usr/bin/env python3
"""Capture blind before/after rare-book rumor panels from a normal UI start."""
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
out = root / 'artifacts/r22'
out.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
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
    if page.locator('#choice [data-pick="0"]').is_visible():
        page.locator('#choice [data-pick="0"]').click()
    page.evaluate('''async () => {
      window.__sect.speed = 0; window.__sect.freeze = true;
      const { foundHermitageSect } = await import('./src/sect.mjs');
      const r = foundHermitageSect(window.__sect.S, 'single');
      if (!r.ok) throw Error(r.why);
      window.__sect.panel();
    }''')
    page.locator('[data-rail="sect"]').click()
    assert page.locator('#rumors').inner_text().find('福州林家老宅') == -1
    images = {'before': page.locator('#rumors').screenshot()}
    page.locator('[data-rare-ask]').click()
    assert '福州林家老宅' in page.locator('#rumors').inner_text()
    page.locator('#rumors').evaluate('(el) => { el.scrollTop = el.scrollHeight; }')
    images['after'] = page.locator('#rumors').screenshot()
    labels = ('before', 'after') if args.seed % 2 else ('after', 'before')
    for label, state in zip(('A', 'B'), labels):
        (out / f'blind-{label}.png').write_bytes(images[state])
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed,
  'answers': dict(zip(('A', 'B'), labels)), 'method': 'normal UI start, real founding and market witness action'}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png']}, ensure_ascii=False))
