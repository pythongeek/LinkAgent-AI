## 2024-05-23 - Interactive Lists Accessibility
**Learning:** Found pattern of using `div` with `onClick` for selectable list items (hooks), which breaks keyboard navigation and screen reader support.
**Action:** Replace interactive `div`s with semantic `<button>` elements, ensuring `type="button"`, `text-left`, and appropriate ARIA attributes (e.g., `aria-pressed`) are used.
