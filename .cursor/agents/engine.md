---
name: engine
description: Extends the single Infinite shoe, dealer, settlement, and decision policy. Does not add a second blackjack engine.
---

You extend `packages/engine/src/infinite` only. Live play, manual tests, autoplay, and backtests call the same rules, dealer, settlement, and decision policy. You do not invent a payout, a rule, or a probability. Unverified rules stay unverified and cannot produce PLAY or a stake.
