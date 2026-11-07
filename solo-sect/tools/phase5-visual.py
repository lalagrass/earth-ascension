#!/usr/bin/env python3
"""Capture Phase 5 micro-stage at tired and medicated states after a normal UI start."""
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
out = root / 'artifacts/phase5'
out.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *values):
        pass
handler = functools.partial(QuietHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
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
    page.evaluate('''() => { window.__sect.freeze = true; window.__sect.focusOn('hero'); window.__microPinned = true;
      const s = window.__sect.S, d = s.ds.find(x => x.id === 'hero');
      d.task = {act:'water', phase:'do'}; d.path = []; s.res.medFood = 1;
      for (const other of s.ds) if (other !== d) other.away = true; // Keep duo combat labels off the labor illustration.
      window.__sect.panel();
    }''')
    assert '藥膳' in page.locator('#res').inner_text()
    answers = {}
    for label, mode in zip(('A', 'B'), ('sore', 'medicated') if args.seed % 2 else ('medicated', 'sore')):
        page.evaluate('''(mode) => { const s = window.__sect.S, d = s.ds.find(x => x.id === 'hero');
          d.skills.strength = mode === 'sore' ? 10 : 26; d.skills.agility = d.skills.strength;
          d.muscleFatigue = mode === 'sore' ? 100 : 35; d.soreness = mode === 'sore';
          d.herbalDietUntil = mode === 'sore' ? 0 : s.t + 600; d.herbalBuffName = '百花玉蜂藥膳';
        }''', mode)
        page.wait_for_timeout(150)
        page.locator('#micro-stage').screenshot(path=str(out / f'blind-{label}.png'))
        answers[label] = mode
    browser.close()
server.shutdown()
if errors:
    raise RuntimeError(errors)
(out / 'blind-answers.json').write_text(json.dumps({'seed': args.seed, 'answers': answers, 'method': 'normal UI start, deterministic render states'}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'seed': args.seed, 'screenshots': ['blind-A.png', 'blind-B.png'], 'answerFile': 'blind-answers.json'}, ensure_ascii=False))
