"""Explicit, copy-only M1 to M2 migration."""
import argparse
from .store import Store


def main():
    parser = argparse.ArgumentParser(description="保留 M1 原檔，遷移複本供 M2 續玩")
    parser.add_argument("source", help="現有 M1 SQLite 檔")
    parser.add_argument("destination", help="尚不存在的 M2 SQLite 檔")
    args = parser.parse_args()
    print(Store.migrate_copy(args.source, args.destination))


if __name__ == "__main__":
    main()
