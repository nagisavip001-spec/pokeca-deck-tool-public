export interface ArticleMeta {
  slug: string
  title: string
  date: string
  description: string
}

export interface Article extends ArticleMeta {
  bodyMarkdown: string
}

const rawModules = import.meta.glob('../content/articles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseFrontmatter(raw: string, slug: string): Article {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    throw new Error(`article ${slug} is missing frontmatter (expected --- ... --- at top of file)`)
  }
  const [, frontmatterBlock, body] = match
  const meta: Record<string, string> = {}
  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (!m) continue
    const [, key, rawValue] = m
    meta[key] = rawValue.trim().replace(/^"(.*)"$/, '$1')
  }
  if (!meta.title || !meta.date) {
    throw new Error(`article ${slug} frontmatter must include at least "title" and "date"`)
  }
  return {
    slug,
    title: meta.title,
    date: meta.date,
    description: meta.description ?? '',
    bodyMarkdown: body.trim(),
  }
}

const articles: Article[] = Object.entries(rawModules).map(([path, raw]) => {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  return parseFrontmatter(raw as string, slug)
})

articles.sort((a, b) => (a.date < b.date ? 1 : -1))

export function getAllArticles(): ArticleMeta[] {
  return articles.map(({ bodyMarkdown: _bodyMarkdown, ...meta }) => meta)
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}
