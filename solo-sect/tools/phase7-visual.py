#!/usr/bin/env python3
"""Capture Phase 7 decision and founded state from the normal hermitage UI."""
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
out = root / 'artifacts/phase7'
out.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *values):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script(f'Date.now = () => {args.seed};')
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('[data-tab="hermitage"]').click()
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true;')
    page.locator('#founding-action [data-found-hermitage]').click()
    page.locator('#choice [data-pick="0"]').wait_for()
    states = [('decision', None), ('founded', None)]
    labels = ('A', 'B') if args.seed % 2 else ('B', 'A')
    states[0] = ('decision', labels[0])
    states[1] = ('founded', labels[1])
    page.screenshot(path=str(out / f'blind-{states[0][1]}.png'))
    page.locator('#choice [data-pick="0"]').click()
    page.evaluate('window.__sect.panel()')
    page.locator('[data-rail="sect"]').click()
    page.get_by_text('終南山・雙劍山莊').first.wait_for()
    page.screenshot(path=str(out / f'blind-{states[1][1]}.png'))
    page.reload(wait_until='domcontentloaded')
    page.locator('[data-tab="hermitage"]').click()
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true;')
    page.locator('#founding-action [data-found-hermitage]').click()
    page.locator('#choice [data-found-banner] .choice-option[data-value="partner"]').click()
    page.locator('#choice [data-found-plaque]').fill('古墓新脈')
    page.locator('#choice [data-pick="1"]').click()
    founded = page.evaluate('''() => ({sect: window.__sect.S.sect.id, plaque: window.__sect.S.sect.plaque, secret: window.__sect.S.sect.secretLineage.includes('quanzhenXinfa')})''')
    assert founded == {'sect': 'gumu', 'plaque': '古墓新脈', 'secret': True}, founded
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': {label: state for state, label in states}, 'method': 'normal hermitage UI start, manual plaque button, dual-hall selection'}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png'], 'answerFile': 'blind-answers.json', 'orthodoxPartner': founded}, ensure_ascii=False))
