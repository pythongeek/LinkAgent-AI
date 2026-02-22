## 2024-05-24 - Accessibility of Interactive Lists
**Learning:** Interactive lists (like selection items) implemented as `div`s with `onClick` are a common accessibility anti-pattern. They lack keyboard focus, role semantics, and activation keys (Enter/Space).
**Action:** Always use semantic `<button>` elements for selection items. Use `aria-pressed` or `aria-selected` to indicate state. Reset button styles (`w-full text-left`) to maintain the list appearance while gaining native accessibility.
