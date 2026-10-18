"""Syntax check for the dashboard scripts that the Python tests never execute.

CI already runs ``node --check`` on ``m2.js``, but most of the dashboard logic is the inline
``<script>`` in ``index.html``.  A syntax error there (for example a bad merge between two UI
PRs) leaves every Python test green while the whole page fails to load.  This only parses the
scripts; it does not run them and does not touch rules, storage or RNG.  Skipped without Node.
"""

import shutil
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

STATIC = Path(__file__).resolve().parent.parent / "earth_ascension" / "static"


class _InlineScripts(HTMLParser):
    """Collect (line number, source) of every <script> without a src attribute."""

    def __init__(self):
        super().__init__()
        self.found = []
        self._current = None

    def handle_starttag(self, tag, attrs):
        if tag == "script" and "src" not in dict(attrs):
            self._current = [self.getpos()[0], ""]

    def handle_data(self, data):
        if self._current is not None:
            self._current[1] += data

    def handle_endtag(self, tag):
        if tag == "script" and self._current is not None:
            self.found.append(tuple(self._current))
            self._current = None


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class StaticScriptSyntaxTest(unittest.TestCase):
    def check(self, source, label):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "script.js"
            path.write_text(source, encoding="utf-8")
            result = subprocess.run(
                ["node", "--check", str(path)], capture_output=True, text=True, timeout=60
            )
        self.assertEqual(result.returncode, 0, f"{label} has a syntax error:\n{result.stderr}")

    def test_index_html_inline_scripts_parse(self):
        parser = _InlineScripts()
        parser.feed((STATIC / "index.html").read_text(encoding="utf-8"))
        self.assertTrue(parser.found, "index.html has no inline <script>; update this test")
        for line, source in parser.found:
            # Pad so a reported line number matches index.html, not the extracted snippet.
            self.check("\n" * (line - 1) + source, f"index.html inline script at line {line}")

    def test_m2_js_parses(self):
        self.check((STATIC / "m2.js").read_text(encoding="utf-8"), "m2.js")


if __name__ == "__main__":
    unittest.main()
