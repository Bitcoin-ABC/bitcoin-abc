Bitcoin ABC version 0.15.1 is now available from:

  <https://download.bitcoinabc.org/0.15.1/>

This release includes the following features and fixes:

- Cache script validation. Backport from Core 10192 (D527, D530, D531).
- Put back copyright notices inadvertently removed by Core (D538).
- Add Amount class for CENT and COIN (D529).
- Display if a node is using Cash magic in getpeerinfo (D546).
- Use Cash magic by default when establishing connections (D547).
- Add seeder to Bitcoin ABC repository. From Bitcoin Seeder by Pieter Wiulle.
  (D559, D560, D561, D562, D564, D565, D566, D568, D579, D585)
- Ensure backupwallet fails if target is the same as source (D550).
- Upgrade to LevelDB 1.20. Port of Core 10544 and 10958 (D580, D584).
- Various backports from Core.
- Various bug fixes.
- Various style fixes, code cleanups, and refactorings.
