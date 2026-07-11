# frontend

Next.js 16 frontend for itsjaya. See the root [README.md](../README.md) for full system architecture, setup instructions, and deployment details.

```bash
npm install
npm run dev     # syncs knowledge base first, then http://localhost:3000
npm run build   # syncs knowledge base first, then static export → out/
npm run sync    # manually sync backend JSON → frontend/src/data/knowledge/
npm run lint
```
