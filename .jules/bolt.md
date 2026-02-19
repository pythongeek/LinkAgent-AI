## 2024-05-23 - Build Artifact Tracking
**Learning:** `dist/index.html` is tracked in git despite `dist/` being in `.gitignore`. This can cause PRs to include broken build artifacts if local builds modify it but don't include corresponding assets.
**Action:** Always revert changes to `dist/index.html` (or untrack it) before submitting PRs to avoid breaking production builds or including partial updates.

## 2024-05-23 - Package Lock Consistency
**Learning:** The project uses `pnpm`, so `package-lock.json` must be removed if generated, and `pnpm-lock.yaml` committed instead.
**Action:** Verify lockfile consistency and delete `package-lock.json` after running `pnpm install`.
