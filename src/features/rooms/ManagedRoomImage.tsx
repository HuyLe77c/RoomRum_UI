import { useEffect, useState } from 'react'
import { getSession } from '../../shared/api/client'

export function ManagedRoomImage({ src, alt }: { src: string; alt: string }) {
  const protectedImage = /^\/api\/rooms\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}\/content$/i.test(src)
  const [image, setImage] = useState<{ source: string; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!protectedImage) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    setFailed(false)
    const token = getSession()?.token
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Không tải được ảnh'); return response.blob() })
      .then(blob => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setImage({ source: src, url: objectUrl })
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, protectedImage])
  const url = protectedImage ? (image?.source === src ? image.url : undefined) : src
  return failed ? <span role="img" aria-label={alt}>Không tải được ảnh</span>
    : url ? <img src={url} alt={alt} onError={() => setFailed(true)} /> : <span role="status">Đang tải ảnh…</span>
}
