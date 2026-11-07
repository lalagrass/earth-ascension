# Parked test assertions

These 20 assertions failed in T1 PR #495 CI. The latest owner decision parks them pending individual review in [#496](https://github.com/lalagrass/earth-ascension/issues/496). Each file header names the original assertion. No parked test runs in the PR quick, golden, or accept gates. Other passing assertions from the same source files remain in `test/archive/`.

Use `node --test test/parked/<name>.test.mjs` from `solo-sect/` when investigating one case. Do not remove an assertion merely to make a gate pass.
