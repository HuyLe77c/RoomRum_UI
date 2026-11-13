import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Minus, Plus, X } from 'lucide-react'
import { api, getSession } from '../../shared/api/client'
import type { AdminUser } from '../../shared/types'

type RegistrationFile = { fileId: string; category: 'PropertyImage' | 'IdentityDocument'; fileName: string; contentType: string }
type PreviewFile = RegistrationFile & { url: string }

export function RegistrationFilesDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const [files, setFiles] = useState<PreviewFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<PreviewFile | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    const urls: string[] = []
    const load = async () => {
      try {
        const metadata = await api<RegistrationFile[]>(`/admin/users/${user.userId}/registration-files`, { signal: abort.signal })
        const previews = await Promise.all(metadata.map(async file => {
          const response = await fetch(`/api/admin/users/${user.userId}/registration-files/${file.fileId}`, {
            signal: abort.signal,
            headers: { Authorization: `Bearer ${getSession()?.token || ''}` },
          })
          if (!response.ok) throw new Error(`Không tải được tệp “${file.fileName}”.`)
          const blob = await response.blob()
          if (abort.signal.aborted) throw new DOMException('Đã hủy tải tệp.', 'AbortError')
          const url = URL.createObjectURL(blob)
          urls.push(url)
          return { ...file, url }
        }))
        if (!abort.signal.aborted) setFiles(previews)
      } catch (cause) {
        if (!abort.signal.aborted) setError((cause as Error).message)
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => { abort.abort(); urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [user.userId])

  const openFile = (file: PreviewFile) => { setSelectedFile(file); setZoom(1) }
  const scrollGallery = (direction: number) => galleryRef.current?.scrollBy({ left: direction * 270, behavior: 'smooth' })

  return <dialog className="registration-files-dialog" ref={dialogRef} onCancel={event => {
    if (selectedFile) { event.preventDefault(); setSelectedFile(null) }
    else onClose()
  }} aria-labelledby="registration-files-title">
    <div className="registration-files-head"><div><h2 id="registration-files-title">Ảnh đăng ký của {user.name}</h2><p>{user.email || 'Chủ phòng'}</p></div><button type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>
    <div className="registration-files-body">{loading ? <p>Đang tải ảnh đăng ký…</p> : error ? <p role="alert">{error}</p> : files.length ?
      <div className="registration-gallery">
        <button className="registration-gallery-arrow" type="button" aria-label="Ảnh trước" onClick={() => scrollGallery(-1)}><ChevronLeft size={23} /></button>
        <div className="registration-gallery-track" ref={galleryRef}>{files.map(file =>
          <button className="registration-gallery-card" type="button" key={file.fileId} onClick={() => openFile(file)} aria-label={`Xem chi tiết ${file.fileName}`}>
            <span className="registration-gallery-thumbnail">{file.contentType === 'application/pdf' ? <FileText size={54} /> : <img src={file.url} alt="" />}</span>
            <span className="registration-gallery-name" title={file.fileName}>{file.fileName}</span>
            <span className="registration-gallery-category">{file.category === 'PropertyImage' ? 'Ảnh phòng' : 'Giấy tờ xác minh'}</span>
          </button>)}</div>
        <button className="registration-gallery-arrow" type="button" aria-label="Ảnh tiếp theo" onClick={() => scrollGallery(1)}><ChevronRight size={23} /></button>
      </div> : <p>Chưa có ảnh hoặc giấy tờ đăng ký.</p>}</div>
    {selectedFile && <div className="registration-preview" role="dialog" aria-modal="true" aria-label={`Chi tiết ${selectedFile.fileName}`}>
      <div className="registration-preview-toolbar"><span title={selectedFile.fileName}>{selectedFile.fileName}</span>
        {selectedFile.contentType !== 'application/pdf' && <div className="registration-preview-zoom"><button type="button" aria-label="Thu nhỏ" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, Math.round(value * 10 - 2) / 10))}><Minus size={18} /></button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Phóng to" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, Math.round(value * 10 + 2) / 10))}><Plus size={18} /></button></div>}
        <button type="button" aria-label="Đóng ảnh chi tiết" onClick={() => setSelectedFile(null)}><X size={22} /></button>
      </div>
      <div className="registration-preview-content">{selectedFile.contentType === 'application/pdf'
        ? <iframe src={selectedFile.url} title={selectedFile.fileName} />
        : <img src={selectedFile.url} alt={selectedFile.fileName} style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none', maxHeight: 'none' } : undefined} />}</div>
    </div>}
  </dialog>
}


