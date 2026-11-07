#!/usr/bin/env python3
"""Phase 4 screenshot blind pair; requires the workspace's Playwright and Chromium."""
import argparse
import functools
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--seed', type=int, default=42)
parser.add_argument('--out', type=pathlib.Path, default=pathlib.Path('artifacts/phase4'))
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = args.out if args.out.is_absolute() else root / args.out
out.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *values):
        pass

handler = functools.partial(QuietHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
answers = {}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for label, mode in zip(('A', 'B'), ('hermitage', 'plain') if args.seed % 2 else ('plain', 'hermitage')):
        page = browser.new_page(viewport={'width': 1600, 'height': 900}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script(f'Date.now = () => {args.seed};')
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
        page.locator(f'[data-tab="{mode}"]').click()
        page.locator('#st-go').click()
        page.wait_for_function('window.__sect && !window.__sect.starting')
        page.evaluate('window.__sect.freeze = true')
        page.screenshot(path=str(out / f'blind-{label}.png'))
        if errors:
            raise RuntimeError(f'{mode} 頁面腳本錯誤: {errors}')
        answers[label] = {'mode': mode, 'actors': page.evaluate('window.__sect.S.ds.length'), 'title': page.locator('#clock').inner_text()}
        page.close()
    browser.close()
server.shutdown()
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': answers}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png'], 'answerFile': 'blind-answers.json'}, ensure_ascii=False))
