## 2024-05-23 - Icon-Only Buttons and Accessibility
**Learning:** Found several instances of icon-only buttons (like `ExternalLink`) lacking `aria-label` and `Tooltip`. These create accessibility barriers and confuse users about functionality.
**Action:** Always wrap icon-only buttons in a `Tooltip` component and ensure they have a descriptive `aria-label`. Use `sonner` for feedback on actions like "Copy".

## 2024-05-23 - SPA Navigation with Links
**Learning:** Found `<a>` tags used for internal routes, causing full page reloads and state loss in the React SPA.
**Action:** Always verify navigation elements use `Link` from `react-router-dom` instead of native anchors.
