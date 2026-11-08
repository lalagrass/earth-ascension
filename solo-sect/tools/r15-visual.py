#!/usr/bin/env python3
"""R9 #529: exercise the sole opening and rejected-save path in the real browser."""
import functools
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'artifacts/r15'
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
    page.locator('#st-go').wait_for()
    assert page.locator('#start .tabs, #start [data-tab]').count() == 0
    assert page.locator('#st-name, #start [data-st], #start [data-q9], #start [name="st-mm"]').count() >= 20
    page.locator('#st-name').fill('山客')
    page.locator('#st-hermit-opening .choice-option[data-value="solo"]').click()
    page.locator('[name="st-mm"][data-mm="pick"]').check()
    page.locator('#st-mbti .choice-option[data-value="INTJ"]').click()
    page.evaluate('document.getElementById("start").scrollTop = 0')
    page.screenshot(path=str(out / 'only-hermitage-opening.png'))
    page.locator('#st-go').click()
    page.wait_for_function('window.__sect && !window.__sect.starting')
    assert page.evaluate('window.__sect.S.hero.name') == '山客'
    assert page.evaluate('window.__sect.S.ds.length') == 1
    assert page.evaluate('window.__sect.S.hero.mbti') == 'INTJ'
    page.evaluate("window.__sect.speed = 0; window.__sect.freeze = true; localStorage.setItem('solo-sect-save', JSON.stringify({v:1,rules:'4.9',ds:[]})); document.getElementById('load').click();")
    assert page.locator('#toast').inner_text() == '存檔版本不符'
    assert page.locator('#start').count() == 1
    page.screenshot(path=str(out / 'version-mismatch-new-game.png'))
    assert not errors, errors
    (out / 'visual-result.json').write_text(json.dumps({'pageErrors': errors, 'onlyHermitage': True, 'name': '山客', 'mbti': 'INTJ', 'oldSaveMessage': '存檔版本不符', 'newGameOpen': True}, ensure_ascii=False, indent=2) + '\n')
    browser.close()
server.shutdown()
print('R9 browser: only hermitage, custom identity, old save rejected and new game open')
