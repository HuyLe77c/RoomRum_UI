import { useEffect, useState } from 'react'
import { api } from '../api/client'

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState('')
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [version, reload] = useState(0)
  useEffect(() => {
    if (!path) { setData(null); setDataPath(null); setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    api<T>(path).then(value => { if (active) { setData(value); setDataPath(path) } }).catch((cause: Error) => { if (active) setError(cause.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path, version])
  return { data, dataPath, loading, error, reload: () => reload(value => value + 1) }
}
