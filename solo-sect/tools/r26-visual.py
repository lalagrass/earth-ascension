#!/usr/bin/env python3
"""Fixed-scenario real UI captures at the low and middle cliff nodes."""
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
out = root / 'artifacts/r26'
out.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *values):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script(f'Date.now = () => {args.seed};')
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.wait_for_selector('#choice [data-pick="0"]')
    page.locator('#choice [data-pick="0"]').click()
    page.evaluate('window.__sect.freeze = true')
    images = {}
    for state, node in [('low-cliff', 'cliff1'), ('waterfall', 'cliff2')]:
        page.evaluate('''async node => {
          const { NODES, CLIFFS } = await import('./src/data.mjs');
          const s = window.__sect.S, d = s.ds.find(x => x.id === 'hero');
          d.pos = [...NODES[node]]; d.at = node; d.path = []; d.task = null;
          s.hermitage.exploredCliffs = Object.keys(CLIFFS);
          window.__sect.panel();
        }''', node)
        page.wait_for_timeout(150)
        images[state] = page.locator('#map').screenshot()
    labels = ('low-cliff', 'waterfall') if args.seed % 2 else ('waterfall', 'low-cliff')
    for label, state in zip(('A', 'B'), labels):
        (out / f'blind-{label}.png').write_bytes(images[state])
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': dict(zip(('A', 'B'), labels)),
    'method': 'real UI hermitage start; freeze; fixed hero position at one of two existing cliff nodes; map render only; no game rule mutation',
    'pixelMeters': 0.025, 'zhangMeters': 3}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png']}, ensure_ascii=False))
