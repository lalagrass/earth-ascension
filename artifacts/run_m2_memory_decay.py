"""Read-only #2 experiment: does a floored monthly decay of memory weight beat the 12-month hard cutoff?

Candidates exist only inside this script. Each one is an isolated copy of `earth_ascension.m2` whose
memory reads (`_intent` action scores and, from 0.2.2, `_goal_review_scores`) use a weight function
instead of the hard `MEMORY_EFFECT_MONTHS` cutoff; the real module, rules versions, RNG namespace and
every committed raw stay untouched. The copy is checked first: with the cutoff weight it must reproduce
the real module's canonical hash under the same rules version on every seed.

Paired design: development seeds 0–29 only (30–39 are held out for the maintainer), 100 NPC × 60
months, same seed → same initial resources, personalities, goals and exogenous draws for every group.

Each rules version is an explicit, separate run with its own raw (`m2-memory-decay-<version>-raw.json`):
0.2.1 is the historical baseline (absorbing rest goal), 0.2.2 the current one (#8 goal review).
Rerun: `PYTHONPATH=. python3 artifacts/run_m2_memory_decay.py --rules-version 0.2.2` (and 0.2.1).
"""
import argparse
import copy
import json
import statistics as st
import types
from collections import Counter, defaultdict
from pathlib import Path

from earth_ascension import m2

SEEDS = range(30)  # development seeds; never 30–39 (held out, #2)
MONTHS = 60
RULES_VERSIONS = ("0.2.1", "0.2.2")
MIN_WEIGHT = .05  # candidate floor: a weight below this scores nothing
PROBE_AGES = (6, 12, 18, 24)
# Memory kinds that move an action score (0.2.1 and 0.2.2), and the action they move.
EFFECT = {"發現": "研究", "關係": "社交", "關係挫折": "社交", "目標受挫": "研究"}
BASE = Path(__file__).parent


def cutoff_weight(age):
    return 1.0 if age <= m2.MEMORY_EFFECT_MONTHS else 0.0


def no_weight(age):
    return 0.0


def decay_weight(half_life):
    def weight(age):
        w = .5 ** (age / half_life)
        return w if w >= MIN_WEIGHT else 0.0
    return weight


# name -> (weight function, ablation)
GROUPS = {
    "cutoff": (cutoff_weight, None),  # the rules version's own 12-month cutoff
    # Full ablation: `_intent` skips memory via the ablation flag; the 0.2.2 goal review does not read that
    # flag, so its memory weight is zero too.
    "no_memory": (no_weight, "no_memory"),
    "halflife_8_3": (decay_weight(8.3), None),
    "halflife_9_1": (decay_weight(9.1), None),  # discrete weight sum closest to the cutoff's 12
}

OLD_BLOCK = """        age = month - memory["observed_month"]
        if age > MEMORY_EFFECT_MONTHS:
            continue
"""
NEW_BLOCK = """        age = month - memory["observed_month"]
        w = _memory_weight(age)
        if w <= 0:
            continue
"""
INCREMENTS = ('scores["研究"] += .35', 'scores["社交"] += .25', 'scores["社交"] -= .6', 'scores["研究"] -= .4')
# 0.2.2 goal review reads memory with the same cutoff; a candidate decays it the same way.
OLD_REVIEW = """        if month - memory["observed_month"] > MEMORY_EFFECT_MONTHS:
            continue
        for candidate, delta in effects.get(event["kind"], ()):
"""
NEW_REVIEW = """        w = _memory_weight(month - memory["observed_month"])
        if w <= 0:
            continue
        for candidate, delta in effects.get(event["kind"], ()):
            delta = delta * w
"""


def weight_profile(weight):
    """Discrete per-decision weights: a memory first counts at age 1 (the month after it is observed)."""
    ages = [a for a in range(1, 121) if weight(a) > 0]
    return {"weight_sum": round(sum(weight(a) for a in ages), 3), "first_age": min(ages), "last_age": max(ages),
            "weight_at": {a: round(weight(a), 3) for a in (1, 6, 12, 13, 18, 24, 36)}}


def patched_module(weight):
    source = Path(m2.__file__).read_text(encoding="utf-8")
    assert source.count(OLD_BLOCK) == 1, "m2._intent memory block changed; update this experiment"
    source = source.replace(OLD_BLOCK, NEW_BLOCK)
    for increment in INCREMENTS:
        assert source.count(increment) == 1, increment
        source = source.replace(increment, increment + " * w")
    assert source.count(OLD_REVIEW) == 1, "m2._goal_review_scores memory block changed; update this experiment"
    source = source.replace(OLD_REVIEW, NEW_REVIEW)
    module = types.ModuleType("m2_memory_decay_candidate")
    module.__package__ = "earth_ascension"
    module.__file__ = m2.__file__
    module._memory_weight = weight
    exec(compile(source, m2.__file__, "exec"), module.__dict__)
    return module


def rank(intent, action):
    order = sorted(intent["feasible"], key=lambda a: (-(intent["scores"][a] + intent["noise"][a]), m2.ACTIONS.index(a)))
    return order.index(action) + 1 if action in order else None


def run(seed, rules_version, weight, ablation):
    mod = patched_module(weight)
    original = mod._intent
    stats = {"actions_by_year": defaultdict(Counter), "hits_by_kind": Counter(), "hits_by_age": Counter(),
             "research_with_discovery_memory": 0, "decisions": 0, "decisions_citing_memory": 0,
             "trace_violations": 0, "probes": {age: [] for age in PROBE_AGES}}

    def traced(person, snapshot, month, event_lookup):
        intent = original(person, snapshot, month, event_lookup)
        year = (month - 1) // 12 + 1
        stats["actions_by_year"][year][intent["action"]] += 1
        stats["decisions"] += 1
        stats["decisions_citing_memory"] += bool(intent["memory_event_ids"])
        own = {m["event_id"]: m for m in person["memories_v2"]}
        for event_id in intent["memory_event_ids"]:
            memory, event = own.get(event_id), event_lookup.get(event_id)
            if memory is None or event is None or memory["observed_month"] > snapshot["month"] or event["kind"] not in EFFECT:
                stats["trace_violations"] += 1
                continue
            stats["hits_by_kind"][event["kind"]] += 1
            stats["hits_by_age"][month - memory["observed_month"]] += 1
        if intent["action"] == "研究" and any(event_lookup[e]["kind"] == "發現" for e in intent["memory_event_ids"]):
            stats["research_with_discovery_memory"] += 1
        if ablation is None:
            for memory, event in m2._visible_memories(person, event_lookup, snapshot["month"]):
                age = month - memory["observed_month"]
                if age not in stats["probes"] or event["kind"] not in EFFECT:
                    continue
                # Same person, same month, same draws; only this one memory removed.
                without = copy.deepcopy(person)
                without["memories_v2"] = [m for m in without["memories_v2"] if m["event_id"] != memory["event_id"]]
                alt = original(without, snapshot, month, event_lookup)
                action = EFFECT[event["kind"]]
                stats["probes"][age].append({"kind": event["kind"],
                                             "score_delta": round(intent["scores"][action] - alt["scores"][action], 3),
                                             "rank_with": rank(intent, action), "rank_without": rank(alt, action),
                                             "choice_changed": intent["action"] != alt["action"]})
        return intent

    mod._intent = traced
    world = mod.new_world(seed, rules_version)
    if ablation:
        world["ablation"] = ablation
    discoveries = Counter()
    goals = {}
    goal_ids = {k: p["goals"][0]["id"] for k, p in world["people"].items()}
    switches = person_months = 0
    for _ in range(MONTHS):
        alive_before = [k for k, p in world["people"].items() if p["alive"]]
        for event in mod.advance(world):
            if event["kind"] == "發現":
                discoveries[(world["month"] - 1) // 12 + 1] += 1
        for k in alive_before:
            person_months += 1
            gid = world["people"][k]["goals"][0]["id"]
            switches += gid != goal_ids[k]
            goal_ids[k] = gid
        if world["month"] in (24, 36, 48, 60):
            living = [p for p in world["people"].values() if p["alive"]]
            goals[world["month"]] = dict(sorted(Counter(p["goals"][0]["type"] for p in living).items()))
    reviews = Counter()
    for p in world["people"].values():
        for r in p.get("goal_reviews", []):
            reviews[f"{r['outcome']}/{r['basis']}"] += 1
            if r["decisive_event_ids"]:
                reviews[f"{r['outcome']}/decisive"] += 1
    probes = {}
    for age, rows in stats["probes"].items():
        probes[age] = {"n": len(rows),
                       "mean_abs_score_delta": round(st.mean(abs(r["score_delta"]) for r in rows), 4) if rows else 0,
                       "rank_changed": sum(r["rank_with"] != r["rank_without"] for r in rows),
                       "choice_changed": sum(r["choice_changed"] for r in rows),
                       "by_kind": dict(sorted(Counter(r["kind"] for r in rows).items()))}
    return {"seed": seed, "hash": m2.canonical_hash(world),
            "actions_by_year": {y: dict(sorted(c.items())) for y, c in sorted(stats["actions_by_year"].items())},
            "decisions": stats["decisions"], "decisions_citing_memory": stats["decisions_citing_memory"],
            "hits_by_kind": dict(sorted(stats["hits_by_kind"].items())),
            "hits_by_age": dict(sorted(stats["hits_by_age"].items())),
            "research_with_discovery_memory": stats["research_with_discovery_memory"],
            "discoveries_by_year": dict(sorted(discoveries.items())), "goals": goals,
            "goal_switches": switches, "person_months": person_months, "goal_reviews": dict(sorted(reviews.items())),
            "trace_violations": stats["trace_violations"], "probes": probes}


def official_hash(seed, rules_version):
    world = m2.new_world(seed, rules_version)
    for _ in range(MONTHS):
        m2.advance(world)
    return m2.canonical_hash(world)


def share(counter, action):
    total = sum(counter.values())
    return counter.get(action, 0) / total if total else 0


def summarize(results):
    lines = []
    base = {r["seed"]: r for r in results["cutoff"]}
    for name, runs in results.items():
        all_actions = Counter()
        yearly = defaultdict(list)
        for r in runs:
            for year, counts in r["actions_by_year"].items():
                all_actions.update(counts)
                yearly[year].append(share(counts, "研究"))
        y5_diff = [share(r["actions_by_year"][5], "研究") - share(base[r["seed"]]["actions_by_year"][5], "研究") for r in runs]
        stable_diff = [r["goals"][60].get("穩定生活", 0) - base[r["seed"]]["goals"][60].get("穩定生活", 0) for r in runs]
        lines.append(f"## {name}")
        lines.append("actions: " + "  ".join(f"{a} {share(all_actions, a):.1%}" for a in m2.ACTIONS))
        lines.append("research share by year (median of seeds): " + " → ".join(f"{st.median(yearly[y]):.1%}" for y in sorted(yearly)))
        lines.append(f"year-5 research vs cutoff (pp, per seed): median {st.median(y5_diff)*100:+.1f}, "
                     f"min {min(y5_diff)*100:+.1f}, max {max(y5_diff)*100:+.1f}; seeds > +2pp: "
                     f"{[r['seed'] for r, d in zip(runs, y5_diff) if d > .02]}")
        lines.append(f"month-60 穩定生活 vs cutoff (people): median {st.median(stable_diff):+}, range {min(stable_diff):+}..{max(stable_diff):+}")
        cited = sum(r["decisions_citing_memory"] for r in runs) / sum(r["decisions"] for r in runs)
        kinds = Counter()
        ages = Counter()
        for r in runs:
            kinds.update(r["hits_by_kind"])
            ages.update({int(a): n for a, n in r["hits_by_age"].items()})
        lines.append(f"decisions citing a memory {cited:.1%}; hits by kind {dict(kinds)}; "
                     f"hits age 1–12 {sum(n for a, n in ages.items() if a <= 12)}, 13+ {sum(n for a, n in ages.items() if a > 12)}")
        lines.append(f"research choices citing a discovery memory: {sum(r['research_with_discovery_memory'] for r in runs)}; "
                     f"discoveries/seed by year: {[round(st.mean(r['discoveries_by_year'].get(y, 0) for r in runs), 1) for y in range(1, 6)]}")
        lines.append(f"trace violations: {sum(r['trace_violations'] for r in runs)}")
        for month in (24, 36, 48, 60):
            top = [max(r["goals"][month].values()) / sum(r["goals"][month].values()) for r in runs]
            rest = [r["goals"][month].get("穩定生活", 0) / sum(r["goals"][month].values()) for r in runs]
            lines.append(f"month {month}: max single-goal share median {st.median(top):.1%} max {max(top):.1%}; "
                         f"穩定生活 median {st.median(rest):.1%}")
        reviews = Counter()
        for r in runs:
            reviews.update(r["goal_reviews"])
        lines.append(f"goal switches per person-month {sum(r['goal_switches'] for r in runs) / sum(r['person_months'] for r in runs):.2%}; "
                     f"reviews {dict(sorted(reviews.items()))}")
        for age in PROBE_AGES:
            n = sum(r["probes"][age]["n"] for r in runs)
            if n:
                lines.append(f"probe age {age}: n {n}, mean |Δscore| "
                             f"{sum(r['probes'][age]['mean_abs_score_delta'] * r['probes'][age]['n'] for r in runs) / n:.3f}, "
                             f"rank changed {sum(r['probes'][age]['rank_changed'] for r in runs)}, "
                             f"choice changed {sum(r['probes'][age]['choice_changed'] for r in runs)}")
        lines.append("")
    lines.append("## per seed: year-5 research share (cutoff / no_memory / 8.3 / 9.1) and month-60 穩定生活 people")
    for seed in SEEDS:
        row = [results[name][seed] for name in GROUPS]
        lines.append(f"seed {seed}: " + " / ".join(f"{share(r['actions_by_year'][5], '研究'):.1%}" for r in row)
                     + " | " + " / ".join(str(r["goals"][60].get("穩定生活", 0)) for r in row))
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules-version", choices=RULES_VERSIONS, required=True)
    rules_version = parser.parse_args().rules_version
    profiles = {name: weight_profile(weight) if ablation is None else {"weight_sum": 0, "note": "memory ablated"}
                for name, (weight, ablation) in GROUPS.items()}
    results = {}
    for name, (weight, ablation) in GROUPS.items():
        results[name] = [run(seed, rules_version, weight, ablation) for seed in SEEDS]
        print(f"{name} done", flush=True)
    for r in results["cutoff"]:
        assert r["hash"] == official_hash(r["seed"], rules_version), (r["seed"], "patched cutoff differs from the real m2 module")
    print(f"patched cutoff reproduces the real {rules_version} module on every seed", flush=True)
    raw = {"rules_version": rules_version, "seeds": list(SEEDS), "months": MONTHS, "min_weight": MIN_WEIGHT,
           "weight_profiles": profiles, "groups": results}
    (BASE / f"m2-memory-decay-{rules_version}-raw.json").write_text(json.dumps(raw, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(profiles, ensure_ascii=False))
    print(summarize(results))


if __name__ == "__main__":
    main()
