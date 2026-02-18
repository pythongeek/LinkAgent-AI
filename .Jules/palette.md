## 2025-02-04 - Interactive List Items
**Learning:** Interactive list items (like selection cards or hook suggestions) are often implemented as `div`s with `onClick`, which excludes keyboard users and screen readers.
**Action:** Always implement these as `<button>` elements with `type="button"`, `text-left`, and `w-full` to maintain the "card" look while ensuring full accessibility (focus, Enter/Space support, screen reader announcement). Use `aria-pressed` for selection states.
