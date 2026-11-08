#!/usr/bin/env python3
"""Capture R3's real hermitage book controls before and after a reading task."""
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
out = root / 'artifacts/r14'
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
    page.locator('[data-tab="hermitage"]').click()
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    if page.locator('#choice [data-pick="0"]').is_visible():
        page.locator('#choice [data-pick="0"]').click()
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true; window.__sect.panel()')
    page.locator('[data-rail="sect"]').click()
    page.get_by_text('山居拳譜分卷').wait_for()
    before = page.locator('[data-hermitage-book]').count()
    assert before > 0, before
    page.locator('[data-hermitage-book]:not([disabled])').first.evaluate('(el) => el.scrollIntoView({block: "end"})')
    a, b = ('A', 'B') if args.seed % 2 else ('B', 'A')
    page.screenshot(path=str(out / f'blind-{a}.png'))
    chosen = page.locator('[data-hermitage-book]:not([disabled])').first.get_attribute('data-hermitage-book')
    person, volume = chosen.split('|')
    page.locator('[data-hermitage-book]:not([disabled])').first.click()
    assigned = page.evaluate('(id) => window.__sect.S.ds.find(d => d.id === id).order', person)
    assert assigned == 'readBook', assigned
    page.evaluate('window.__sect.speed = 1; window.__sect.freeze = false;')
    page.wait_for_function('(id) => window.__sect.S.ds.find(d => d.id === id).task?.act === "readBook"', arg=person)
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true; window.__sect.panel()')
    if page.locator('#choice [data-pick="0"]').is_visible():
        page.locator('#choice [data-pick="0"]').click()
    page.locator('[data-rail="person"]').click()
    page.evaluate('document.querySelector("#panel").scrollTop = 0')
    page.screenshot(path=str(out / f'blind-{b}.png'))
    assert not errors, errors
    browser.close()
server.shutdown()
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': {a: 'books available', b: 'reading ordered'}, 'method': 'normal hermitage UI, companion start, sect book button', 'reader': person, 'volume': volume}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png'], 'bookButtons': before, 'order': assigned, 'reader': person, 'volume': volume}, ensure_ascii=False))
