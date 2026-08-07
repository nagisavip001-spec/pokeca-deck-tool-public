import { Link } from 'react-router-dom'
import { getAllArticles } from '../lib/articles'

export default function ArticleList() {
  const articles = getAllArticles()

  return (
    <div className="min-h-screen bg-gray-50 pb-[50px]">
      <header className="bg-blue-800 text-white px-4 py-3 shadow-md">
        <div>
          <Link to="/" className="text-blue-200 text-xs underline">
            ← ツールに戻る
          </Link>
          <h1 className="text-lg font-bold tracking-tight mt-1">確率・デッキ構築コラム</h1>
          <p className="text-blue-200 text-xs mt-0.5">ポケカで役立つ確率の知識をまとめています</p>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {articles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">まだ記事がありません。</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <Link to={`/articles/${a.slug}`} className="block">
                  <p className="text-xs text-gray-400">{a.date}</p>
                  <h2 className="text-sm font-semibold text-gray-800 mt-1">{a.title}</h2>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
