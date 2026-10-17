"""Post-hoc paired recheck of every flagged seed, preserving every run."""
import json
import platform
from pathlib import Path

from artifacts.run_m2_experiments import store_perf


def main():
    results = {"environment": {"platform": platform.platform(), "python": platform.python_version()},
               "method": "post-hoc; seeds 16 and 17 flagged by original 30-seed single-run ratios; five paired repeats, M1 then M2",
               "pairs": []}
    for seed in (16, 17):
        for repeat in range(1, 6):
            m1_time, m1_size = store_perf(seed, legacy=True)
            m2_time, m2_size = store_perf(seed)
            row = {"seed": seed, "repeat": repeat, "m1_seconds": m1_time,
                   "m2_seconds": m2_time, "ratio": m2_time / m1_time,
                   "m1_mib": m1_size, "m2_mib": m2_size}
            results["pairs"].append(row)
            print(row, flush=True)
    Path(__file__).with_name("m2-perf-outliers-raw.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
