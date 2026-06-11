import { useEffect } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

const AD_CLIENT = 'ca-pub-2225477722800340'
// AdSenseでバナー広告ユニットを作成後、発行されるスロットIDに置き換える
const AD_SLOT = 'XXXXXXXXXX'

// 画面下部に固定表示する広告枠。
// 高さを固定することで、広告の表示有無やサイズに関わらず本体UIのボタン位置がズレないようにする。
export default function AdBanner() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // AdSense未承認・ブロック時などは何もしない
    }
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[50px] bg-gray-100 border-t border-gray-200 flex items-center justify-center z-20 overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '320px', height: '50px' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
      />
    </div>
  )
}
