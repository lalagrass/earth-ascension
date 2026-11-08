#!/usr/bin/env python3
"""Capture the real story choice after a normal hermitage UI start."""
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
out = root / 'artifacts/r23'
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
    if page.locator('#choice [data-pick="0"]').is_visible():
        page.locator('#choice [data-pick="0"]').click()
    page.evaluate('''async () => { window.__sect.freeze = true;
      const { card } = await import('./src/jianghu.mjs');
      card(window.__sect.S, 'kuihua', true);
      window.__sect.panel();
    }''')
    page.locator('#choice').screenshot(path=str(out / 'kuihua-choice.png'))
    choice = page.locator('#choice').inner_text()
    assert '實本' in choice and '自宮' in choice
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'visual-answers.json').write_text(json.dumps({'seed': args.seed, 'method': 'normal UI start, fixed story card', 'choiceText': choice}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'image': 'kuihua-choice.png', 'checked': True}, ensure_ascii=False))
