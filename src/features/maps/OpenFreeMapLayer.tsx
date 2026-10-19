import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { mapStyleUrl } from './mapConfig'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export function OpenFreeMapLayer() {
  const map = useMap()
  useEffect(() => {
    const layer = maplibreGL({ style: mapStyleUrl('bright'), interactive: false, attributionControl: false })
    layer.addTo(map)
    const attribution = 'OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap contributors'
    map.attributionControl?.addAttribution(attribution)
    return () => {
      map.attributionControl?.removeAttribution(attribution)
      map.removeLayer(layer)
    }
  }, [map])
  return null
}
