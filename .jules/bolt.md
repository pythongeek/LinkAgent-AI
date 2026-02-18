## 2024-05-23 - Sequential API Calls in Service Layer
**Learning:** Found that `TrendAnalyzer` service was executing independent API calls sequentially, tripling the latency for trend analysis. This pattern may exist in other data-aggregation services.
**Action:** Review other services (like `ResearchService`) for similar sequential patterns when fetching data from multiple sources.
