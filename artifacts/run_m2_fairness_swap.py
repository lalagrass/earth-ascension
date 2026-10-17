"""Logical identity swap: control keyed RNG when exchanging physical IDs."""
import copy
import json
from pathlib import Path
from unittest.mock import patch

from earth_ascension import m2


def fixture(seed, swapped):
    world = m2.new_world(seed)
    reference = copy.deepcopy(world["people"]["1"])
    for person in world["people"].values():
        person["alive"] = person["id"] in (1, 6)
    for pid in (1, 6):
        p = world["people"][str(pid)]
        p["name"] = "logical-A" if (pid == 1) != swapped else "logical-B"
        p["district"] = reference["district"]
        p["budget"] = reference["budget"]
        p["traits"] = copy.deepcopy(reference["traits"])
        p["skills"] = copy.deepcopy(reference["skills"])
        p["profile_current"] = copy.deepcopy(reference["profile_current"])
        p["profile_current"].update({"探索": 1, "開放": 1, "外向": 0, "關懷": 0})
        p["profile"] = copy.deepcopy(p["profile_current"])
        p["goal"] = "探索靈氣"
        p["goals"][0].update(type="探索靈氣", label="探索靈氣")
        p["plan"].update(action="研究", step="累積研究紀錄")
        p["wealth"] = 100
        p["health"] = 100
    return world


def outcome(seed, swapped):
    world = fixture(seed, swapped)
    original = m2.draw
    physical_to_logical = ({1: 6, 6: 1} if swapped else {1: 1, 6: 6})

    def keyed_draw(s, month, actor, purpose, target=""):
        if isinstance(actor, int):
            actor = physical_to_logical.get(actor, actor)
        if isinstance(target, int):
            target = physical_to_logical.get(target, target)
        return original(s, month, actor, purpose, target)

    with patch.object(m2, "draw", keyed_draw):
        m2.advance(world)
    logical = {p["name"]: {"action": p["last_decision"]["action"],
                           "resolution": p["last_decision"]["resolution"],
                           "discovered": any(e["kind"] == "發現" and e["actor"] == p["id"]
                                             for e in world["events"])}
               for p in world["people"].values() if p["alive"]}
    return logical


def main():
    samples = []
    for seed in range(2000):
        normal = outcome(seed, False)
        if (set(x["action"] for x in normal.values()) != {"研究"}
                or not any(x["resolution"] == "research_contested" for x in normal.values())):
            continue
        swapped = outcome(seed, True)
        assert normal == swapped, (seed, normal, swapped)
        samples.append({"seed": seed, "normal": normal, "swapped": swapped})
        if len(samples) == 30:
            break
    assert len(samples) == 30, len(samples)
    path = Path(__file__).with_name("m2-fairness-swap-raw.json")
    path.write_text(json.dumps(samples, ensure_ascii=False, indent=2))
    print({"paired": len(samples), "logical_A_wins": sum(x["normal"]["logical-A"]["discovered"] for x in samples),
           "seed_min": samples[0]["seed"], "seed_max": samples[-1]["seed"]})


if __name__ == "__main__":
    main()
