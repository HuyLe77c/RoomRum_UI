import { useEffect, useRef, useState } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { mapStyleUrl, mapTileUrl } from './mapConfig'
import { enhanceMapStyle } from './enhanceMapStyle'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export function OpenFreeMapLayer({ onFallback }: { onFallback?: () => void }) {
  const map = useMap()
  const [fallback, setFallback] = useState(false)
  const fallbackCallback = useRef(onFallback)
  fallbackCallback.current = onFallback
  useEffect(() => {
    if (fallback) return
    const layer = maplibreGL({ style: mapStyleUrl('bright'), interactive: false, attributionControl: false })
    let added = false
    let loaded = false
    let disposed = false
    const fail = () => {
      if (disposed) return
      setFallback(true)
      fallbackCallback.current?.()
    }
    try { layer.addTo(map); added = true } catch { fail(); return }
    const attribution = 'OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap contributors'
    map.attributionControl?.addAttribution(attribution)
    let vectorMap: ReturnType<typeof layer.getMaplibreMap>
    try { vectorMap = layer.getMaplibreMap() } catch {
      map.attributionControl?.removeAttribution(attribution)
      if (added) map.removeLayer(layer)
      fail()
      return
    }
    const onLoad = () => { loaded = true; enhanceMapStyle(vectorMap) }
    const onError = (event: { error?: { message?: string } }) => {
      if (!loaded && /403|404|fetch|style|network/i.test(event.error?.message || '')) fail()
    }
    vectorMap.on('load', onLoad)
    vectorMap.on('error', onError)
    const timeout = window.setTimeout(() => { if (!loaded) fail() }, 9000)
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      vectorMap.off('load', onLoad)
      vectorMap.off('error', onError)
      map.attributionControl?.removeAttribution(attribution)
      if (added) map.removeLayer(layer)
    }
  }, [map, fallback])
  return fallback ? <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url={mapTileUrl} /> : null
}
