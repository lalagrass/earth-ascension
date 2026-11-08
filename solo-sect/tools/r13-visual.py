#!/usr/bin/env python3
"""Capture R4 solo opening and the single-lineage founding card through the normal UI."""
import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'artifacts/r13'
out.mkdir(parents=True, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
    page.locator('[data-tab="hermitage"]').click()
    page.locator('#st-hermit-opening .choice-option[data-value="solo"]').click()
    page.screenshot(path=str(out / 'solo-opening.png'))
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    page.evaluate('window.__sect.speed = 0; window.__sect.freeze = true;')
    assert page.evaluate('window.__sect.S.ds.length') == 1
    page.locator('#founding-action [data-found-hermitage]').click()
    page.locator('#choice [data-pick="0"]').wait_for()
    assert page.locator('#choice [data-pick]').count() == 2
    page.screenshot(path=str(out / 'solo-founding.png'))
    page.locator('#choice [data-pick="0"]').click()
    assert page.evaluate('window.__sect.S.sect.doctrine') == 'single'
    assert not errors, errors
    browser.close()
server.shutdown()
print('R4 UI: solo start, two-option founding card, single-lineage result')
