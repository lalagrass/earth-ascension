"""Read-only checks for the spec handoff; does not validate a game runtime."""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / "solo-sect-gpt"
DOCS = ["SPEC.md", "ACCEPTANCE.md", "ASSET_CONTRACT.md", "IMPLEMENTATION_ORDER.md"]
planning = json.loads((BASE / "handoff/planning.ready.json").read_text())
assert planning["status"] == "ready"
assert planning["artifactCommit"] == "e530a2c078722fd69732332eef2cd964da99ad24"
assert subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT, text=True).strip() == "codex/solo-sect-gpt"
subprocess.run(["git", "merge-base", "--is-ancestor", planning["artifactCommit"], "HEAD"], cwd=ROOT, check=True)
for relative in planning["artifacts"]:
    subprocess.run(["git", "cat-file", "-e", planning["artifactCommit"] + ":" + relative], cwd=ROOT, check=True)
print(f"planning ready / ancestry / branch / {len(planning['artifacts'])} committed artifacts: PASS")

links = 0
for name in DOCS:
    path = BASE / "docs" / name
    content = path.read_text()
    assert content.startswith("# ") and "2026-10-25" in content
    assert "GPT-6.1 Sol / high" in content
    assert not re.search(r"\b(?:TODO|TBD|FIXME)\b", content)
    assert not any(line.rstrip() != line for line in content.splitlines())
    for href in re.findall(r"\]\(([^)]+)\)", content):
        if "://" in href or href.startswith("#"):
            continue
        assert (path.parent / href.split("#")[0]).exists(), (name, href)
        links += 1
print(f"four documents / attribution / local links ({links}) / no placeholders or trailing whitespace: PASS")

spec = (BASE / "docs/SPEC.md").read_text()
acceptance = (BASE / "docs/ACCEPTANCE.md").read_text()
assert re.findall(r"^## S(\d{2})\b", spec, re.M) == [f"{i:02}" for i in range(1, 13)]
assert re.findall(r"^\| A(\d{2})\b", acceptance, re.M) == [f"{i:02}" for i in range(1, 45)]
for milestone in range(8):
    assert f"| SL{milestone} " in (BASE / "docs/IMPLEMENTATION_ORDER.md").read_text()
for seed in (11, 29, 47, 71, 101):
    assert str(seed) in acceptance
for token in ("recruit.worker", "recruit.school", "recruit.fame", "hong.1/2", "linghu.1/2", "qiao.1/2", "guo.1/2", "yue.1/2", "cave.see", "cave.choice", "cave.return"):
    assert token in spec, token
print("S01-S12 / A01-A44 / SL0-SL7 / five seeds / 16 finite story nodes named: PASS")

changed = subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, text=True).splitlines()
assert all(line[3:].startswith("solo-sect-gpt/") for line in changed), changed
assert all(line[3:].startswith(("solo-sect-gpt/docs/", "solo-sect-gpt/evidence/spec/", "solo-sect-gpt/handoff/spec.ready.json")) for line in changed), changed
print("pending changes restricted to this stage's docs / evidence / ready marker: PASS")
print("LIMIT: static document checks only; no runtime, browser, geometry, balance or performance verification")
