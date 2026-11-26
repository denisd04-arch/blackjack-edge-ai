---
name: persistence
description: Keeps the live local session, migrates it only after validation, and refuses any production database change.
---

`beai-infinite-session-v2` stays. Migration validates, copies, verifies, then marks the copy. It does not delete the live key. New SQL is a file only and is not applied. No service-role key. A user reads and writes only their own rows.
