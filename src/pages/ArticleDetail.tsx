import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marked } from 'marked'
import { getArticleBySlug } from '../lib/articles'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticleBySlug(slug) : undefined
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (!article) return
    let cancelled = false
    Promise.resolve(marked.parse(article.bodyMarkdown)).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => {
      cancelled = true
    }
  }, [article])

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 text-center">
        <p className="text-sm text-gray-500">記事が見つかりませんでした。</p>
        <Link to="/articles" className="text-xs text-blue-500 underline mt-3 inline-block">
          コラム一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-[50px]">
      <header className="bg-blue-800 text-white px-4 py-3 shadow-md">
        <Link to="/articles" className="text-blue-200 text-xs underline">
          ← コラム一覧に戻る
        </Link>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-400">{article.date}</p>
          <h1 className="text-lg font-bold text-gray-800 mt-1 mb-4">{article.title}</h1>
          <div
            className="prose prose-sm max-w-none text-gray-700 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_table]:text-xs [&_table]:border-collapse [&_th]:border [&_th]:border-gray-200 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-blue-500 underline">
            確率計算ツールを使ってみる →
          </Link>
        </div>
      </main>
    </div>
  )
}
