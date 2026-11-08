#!/usr/bin/env python3
"""R8 #526: blind before/after rumor-panel view in the real browser."""
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
out = root / 'artifacts/r16'
out.mkdir(parents=True, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *values):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script(f'Date.now = () => {args.seed};')
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    if page.locator('#choice [data-pick="0"]').is_visible():
        page.locator('#choice [data-pick="0"]').click()
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true; window.__sect.panel()')
    page.locator('[data-rail="sect"]').click()
    a, b = ('A', 'B') if args.seed % 2 else ('B', 'A')
    page.locator('#rumors').scroll_into_view_if_needed()
    assert '尚無外人親見' in page.locator('#rumors').inner_text()
    page.screenshot(path=str(out / f'blind-{a}.png'))
    result = page.evaluate('''async () => {
      const s = window.__sect.S;
      const { foundHermitageSect } = await import('./src/sect.mjs');
      const { spreadRumors } = await import('./src/rumors.mjs');
      const result = foundHermitageSect(s, 'single');
      if (!result.ok) return result;
      s.day += 1;
      spreadRumors(s);
      window.__sect.panel();
      return result;
    }''')
    assert result['ok'], result
    page.locator('#rumors').scroll_into_view_if_needed()
    assert '過路山民' in page.locator('#rumors').inner_text()
    assert page.locator('#rumors .rumor-map .on').count() == 1
    page.screenshot(path=str(out / f'blind-{b}.png'))
    assert not errors, errors
    (out / 'blind-answers.json').write_text(json.dumps({
      'seed': args.seed, 'answers': {a: 'before founding: no outside rumor', b: 'named banner witnessed at gate and carried to village'},
      'method': 'real browser UI; fixed founding action via sim API, then one daily rumor-spread step',
      'pageErrors': errors
    }, ensure_ascii=False, indent=2) + '\n')
    browser.close()
server.shutdown()
print(json.dumps({'seed': args.seed, 'screenshots': [f'blind-{a}.png', f'blind-{b}.png'], 'rumorAfter': True, 'pageErrors': []}, ensure_ascii=False))
