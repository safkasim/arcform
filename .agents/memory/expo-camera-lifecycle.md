---
name: Expo camera lifecycle
description: Native camera permission recovery and resource cleanup requirements in retained tab screens.
---

Refresh native camera permission state whenever the app returns to the foreground, and mount the camera preview only while both the route and app are active. Stop active recording during blur, backgrounding, and cleanup.

**Why:** Permission hooks can remain stale after a user enables access in device Settings, and retained tab screens can otherwise keep native camera resources active after navigation.

**How to apply:** Any Expo camera flow inside tabs or retained navigation must observe route focus and AppState, refresh permissions on foreground, handle camera mount errors, and unmount the preview when inactive.