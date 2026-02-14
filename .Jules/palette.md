## 2025-05-24 - Interactive Clipboard Feedback
**Learning:** Users often lack confidence that "Copy to Clipboard" actions succeeded. Simple toast notifications are good, but changing the button text/icon to "Copied!" provides immediate, localized confirmation that feels much snappier.
**Action:** Use the `useClipboard` hook for all copy actions to standardize this interaction pattern (Toast + Icon Swap).
