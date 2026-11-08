#!/usr/bin/env python3
"""Capture actual records and personal timeline from a fixed browser scenario."""
import functools
import argparse
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--seed', type=int, default=17)
args = parser.parse_args()
out = root / 'artifacts/achievement1'
out.mkdir(parents=True, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 950}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script(f'Date.now = () => {args.seed};')
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.evaluate('''async () => {
      window.__sect.freeze = true; window.__sect.speed = 0;
      const { recordDeed } = await import('./src/util.mjs');
      const { recordRumor } = await import('./src/rumors.mjs');
      const { seeEnemy } = await import('./src/world.mjs');
      const s = window.__sect.S, hero = s.ds.find(d => d.id === 'hero');
      s.day = 3;
      recordDeed(s, hero, 'break');
      seeEnemy(s, 'dog', 'kill', hero);
      recordRumor(s, 'defend', '村路過客');
      window.__sect.panel();
    }''')
    page.locator('[data-rail="records"]').click()
    assert '第一門整套武學' in page.locator('#timeline').inner_text()
    captures = {'timeline': page.locator('#timeline').screenshot()}
    page.locator('[data-rail="achievements"]').click()
    assert '守住山犬' in page.locator('#achievements').inner_text()
    captures['achievements'] = page.locator('#achievements').screenshot()
    labels = ('timeline', 'achievements') if args.seed % 2 else ('achievements', 'timeline')
    for letter, label in zip(('A', 'B'), labels):
        (out / f'blind-{letter}.png').write_bytes(captures[label])
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': dict(zip(('A', 'B'), labels)),
    'method': 'normal UI start; fixed day 3 deed, codex kill and witnessed rumor; no page errors'}, ensure_ascii=False, indent=2) + '\n')
print('achievement1 UI: blind-A.png, blind-B.png, blind-answers.json; page errors: 0')
