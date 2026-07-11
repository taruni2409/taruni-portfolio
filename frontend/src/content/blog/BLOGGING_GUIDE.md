# Blog Writing Guide

Reference for formatting, images, and components when writing `.mdx` posts.

---

## Creating a new post

1. Create a file in `frontend/src/content/blog/your-slug.mdx`
2. The filename becomes the URL: `/blog/your-slug`
3. Start every file with frontmatter:

```mdx
---
title: Your Post Title Here
date: "2026-04-21"
description: One sentence that shows on the blog index card.
tags: [ai, engineering, life, distributed-systems]
---
```

---

## Images

### Where to put image files
Drop them in `frontend/public/blog/` — create the folder if it doesn't exist.

```
frontend/
└── public/
    └── blog/
        ├── my-screenshot.png
        ├── architecture-diagram.jpg
        └── profile-photo.webp
```

### Basic image (no caption)
```mdx
![Description of the image](/blog/my-screenshot.png)
```

### Image with caption
Add the caption as the **title** (in quotes after the path):
```mdx
![Description of the image](/blog/my-screenshot.png "This text appears as a caption below the image")
```

### Using the BlogImage component directly
Gives you more control:
```mdx
<BlogImage
  src="/blog/my-screenshot.png"
  alt="Description of the image"
  caption="Optional caption text"
/>
```

> **Tip:** Use `.webp` format for best performance. Recommended width: 1200px or wider.

---

## Callout boxes

Four variants available. Use them to highlight important points.

### Info — general context or background
```mdx
<Callout type="info" title="Context">
  Something the reader should know before continuing.
</Callout>
```

### Tip — actionable advice
```mdx
<Callout type="tip" title="Pro tip">
  A specific thing the reader can do or try.
</Callout>
```

### Warning — caution or gotcha
```mdx
<Callout type="warning" title="Watch out">
  Something that could go wrong or trip people up.
</Callout>
```

### Quote — a standout idea or reflection
```mdx
<Callout type="quote" title="Worth remembering">
  A sentence or idea worth sitting with.
</Callout>
```

> **Note:** The `title` prop is optional — if you leave it out, the variant name is shown ("Info", "Tip", etc.)

---

## Decorative divider

Use between major sections to create visual breathing room:
```mdx
<Divider />
```
Renders as a thin line with a `✦` in the centre.

---

## Text formatting

| What you write | What it renders |
|---|---|
| `**bold text**` | **bold text** |
| `*italic text*` | *italic text* |
| `` `inline code` `` | `inline code` |
| `~~strikethrough~~` | ~~strikethrough~~ |

---

## Headings

```mdx
## Section heading        ← adds a horizontal rule below, good for major sections
### Sub-section           ← no rule, slightly smaller
#### Small label          ← uppercase, tracked, used for micro-labels
```

Hovering any `##` or `###` heading reveals a `#` anchor link — great for linking people to specific sections.

---

## Blockquote

Use for pull quotes or short reflections:
```mdx
> The process and the path you choose will define you.
```

---

## Lists

**Unordered:**
```mdx
- First item
- Second item
  - Nested item
```

**Ordered:**
```mdx
1. Step one
2. Step two
3. Step three
```

---

## Code blocks

Inline code uses backticks:
```mdx
Use `npm run dev` to start the server.
```

Fenced code block with syntax highlighting label:
````mdx
```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```
````

```typescript
```typescript
const greet = (name: string): string => `Hello, ${name}!`;
```
```

Supported language labels: `python`, `typescript`, `javascript`, `bash`, `json`, `yaml`, `sql`, `go`, `rust`, etc.

---

## Tables

```mdx
| Column A | Column B | Column C |
|---|---|---|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

---

## Horizontal rule

A plain `---` renders a thin dividing line (different from `<Divider />`):
```mdx
---
```

---

## Full example post

````mdx
---
title: How I Cut API Latency by 78%
date: "2026-04-21"
description: A walkthrough of the Redis Write-Through caching strategy we used to drop P99 from 450ms to under 100ms.
tags: [engineering, redis, performance, distributed-systems]
---

Latency was killing us. Every multi-hop query through our LangGraph agents was stacking up — 450ms P99 at 3K RPS isn't just slow, it's a liability.

<Callout type="info" title="Context">
  This was built on top of our Multi-Agent Research Discovery Engine at NYU IT. The system
  indexes millions of papers from Elsevier's Science Direct and Scopus.
</Callout>

## The problem

Our agents were making repeated calls for the same researcher profiles across different hops in the chain. No caching meant every call hit the database cold.

![Architecture before caching](/blog/before-caching.png "Before: every hop hit the DB directly")

## The fix

We introduced a Write-Through Redis layer with custom TTL eviction:

```python
async def get_researcher(id: str) -> Researcher:
    cached = await redis.get(f"researcher:{id}")
    if cached:
        return Researcher.parse_raw(cached)
    data = await db.fetch_researcher(id)
    await redis.setex(f"researcher:{id}", 3600, data.json())
    return data
```

<Callout type="tip" title="Why Write-Through?">
  Write-Through keeps cache and DB in sync on every write. For researcher profiles that update
  infrequently, this was the right trade-off over Write-Back.
</Callout>

## Results

| Metric | Before | After |
|---|---|---|
| P99 latency | 450ms | < 100ms |
| Cache hit rate | 0% | 87% |
| DB load | 100% | 13% |

<Divider />

The lesson: don't reach for caching as a last resort. Model your access patterns first, then pick the right strategy.
````

---

## Quick reference card

```
Images         → ![alt](/blog/file.jpg "caption")
Callout info   → <Callout type="info" title="Title">...</Callout>
Callout tip    → <Callout type="tip" title="Title">...</Callout>
Callout warn   → <Callout type="warning" title="Title">...</Callout>
Callout quote  → <Callout type="quote" title="Title">...</Callout>
Divider        → <Divider />
Bold           → **text**
Italic         → *text*
Inline code    → `code`
Code block     → ```language ... ```
Blockquote     → > text
Table          → | col | col |
Heading 2      → ## (with bottom border)
Heading 3      → ### (no border)
```
