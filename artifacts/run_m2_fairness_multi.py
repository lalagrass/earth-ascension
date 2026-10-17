"""A6 conditional three-person social/knowledge fairness probe; no file writes."""

import copy
import itertools
from unittest.mock import patch

from earth_ascension import m2


IDS = (1, 6, 11)
ROLES = ("A", "B", "C")


def run(seed, permutation):
    world = m2.new_world(seed)
    reference = copy.deepcopy(world["people"]["1"])
    role_to_id = dict(zip(ROLES, permutation))
    id_to_role = {pid: role for role, pid in role_to_id.items()}
    for person in world["people"].values():
        person["alive"] = person["id"] in IDS
    for role, pid in role_to_id.items():
        person = world["people"][str(pid)]
        person["name"] = f"logical-{role}"
        for field in ("age", "months_lived", "budget", "district", "traits", "skills"):
            person[field] = copy.deepcopy(reference[field])
        person["profile_current"] = {**reference["profile_current"], "外向": 1,
                                     "關懷": 1, "探索": 0, "親和": .5}
        person["profile"] = copy.deepcopy(person["profile_current"])
        person["profile_base"] = copy.deepcopy(person["profile_current"])
        person["goal"] = "建立關係"
        person["goals"][0].update(type="建立關係", label="建立關係")
        person["plan"].update(action="社交", step="維繫區域關係")
        person["wealth"] = person["health"] = 100
        person["need"] = "生活"
        person["known"] = []
        person["knowledge_v2"] = []
        person["memories_v2"] = []
        person["relationships_v2"] = {}
        person["relations"] = {}
        next_role = {"A": "B", "B": "C", "C": "A"}[role]
        target = role_to_id[next_role]
        person["relationships_v2"][str(target)] = {
            "trust": 90, "last_event_id": None, "last_interaction_month": None,
        }
        person["relations"][str(target)] = 90

    actor = world["people"][str(role_to_id["A"])]
    discovery = m2._event(world, "發現", actor["id"], "known A", important=True)
    actor["knowledge_v2"].append({"fact_id": "practice_basis",
                                  "source_event_id": discovery["event_id"],
                                  "learned_month": 0, "confidence": 1.0})

    original_draw = m2.draw

    def keyed_draw(s, month, actor_id, purpose, target=""):
        if isinstance(actor_id, int):
            actor_id = id_to_role.get(actor_id, actor_id)
        if isinstance(target, int):
            target = id_to_role.get(target, target)
        return original_draw(s, month, actor_id, purpose, target)

    with patch.object(m2, "draw", keyed_draw):
        m2.advance(world)
        first = {}
        for role, pid in role_to_id.items():
            person = world["people"][str(pid)]
            decision = person["last_decision"]
            first[role] = {
                "action": decision["action"],
                "target": id_to_role.get(decision["target"]),
                "scores": decision["scores"],
                "noise": decision["noise"],
                "known_before": decision["known_fact_ids"],
                "known_after": bool(person["knowledge_v2"]),
                "outcome": person["last_action"]["outcome"],
                "trust_to_target": person["relations"].get(str(decision["target"])),
            }
        recipient = world["people"][str(role_to_id["B"])]
        if recipient["knowledge_v2"]:
            source_id = recipient["knowledge_v2"][0]["source_event_id"]
            source = next(e for e in world["events"] if e["event_id"] == source_id)
            assert source["target"] == recipient["id"]
            assert discovery["event_id"] in source["causal_event_ids"]
        m2.advance(world)
        second = {role: bool(world["people"][str(pid)]["last_decision"]["known_fact_ids"])
                  for role, pid in role_to_id.items()}
    return first, second


def main():
    samples = []
    for seed in range(300):
        baseline = run(seed, IDS)
        first, second = baseline
        if not all(person["action"] == "社交" for person in first.values()):
            continue  # Condition on intent only, before the social outcome.
        assert {role: person["target"] for role, person in first.items()} == {
            "A": "B", "B": "C", "C": "A",
        }, seed
        assert first["B"]["known_before"] == first["C"]["known_before"] == [], seed
        assert first["C"]["known_after"] is False, seed
        assert second["B"] == first["B"]["known_after"], seed
        assert second["C"] is False, seed
        for permutation in itertools.permutations(IDS):
            assert baseline == run(seed, permutation), (seed, permutation)
        samples.append({"seed": seed, "shared_to_B": first["B"]["known_after"]})
        if len(samples) == 30:
            break
    assert len(samples) == 30, len(samples)
    print({"seeds": [row["seed"] for row in samples], "pairs": len(samples),
           "id_permutations": 6, "shared_to_B": sum(row["shared_to_B"] for row in samples),
           "same_month_C_known": 0})


if __name__ == "__main__":
    main()
