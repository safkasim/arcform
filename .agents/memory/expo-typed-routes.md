---
name: Expo typed routes
description: How to handle stale generated route types immediately after adding an Expo Router screen.
---

Expo Router's generated route union can remain stale during a non-interactive typecheck immediately after a new route file is added.

**Why:** A valid new dynamic route was rejected by TypeScript until Metro had a chance to regenerate route metadata; both string and route-object navigation were affected.

**How to apply:** Prefer normal typed route objects once generation catches up. During the same change that creates a route, a narrow `unknown as Href` cast at the navigation call site is acceptable; do not weaken router typing globally.