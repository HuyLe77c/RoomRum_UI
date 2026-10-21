import type { AllLayoutProperties, AllPaintProperties, ExpressionSpecification, FilterSpecification, Map, SymbolLayerSpecification } from 'maplibre-gl'
import type { MapStyle } from './mapConfig'

// OpenFreeMap's vector tiles contain POIs at z14, but its default styles defer
// most labels until z15-17. Keep the labels readable while revealing useful
// places as the visitor moves from a neighbourhood to a street.
const placeName: ExpressionSpecification = ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name_en']]
const essentialPlace = ['any',
  ['match', ['get', 'class'], ['school', 'college', 'hospital', 'pharmacy'], true, false],
  ['match', ['get', 'subclass'], ['university', 'clinic', 'doctors', 'pharmacy'], true, false],
] as FilterSpecification

function enhanceOverview(map: Map) {
  const paint = <K extends keyof AllPaintProperties>(id: string, property: K, value: AllPaintProperties[K]) => {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value)
  }
  const layout = <K extends keyof AllLayoutProperties>(id: string, property: K, value: AllLayoutProperties[K]) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, property, value)
  }

  // A quieter street grid leaves room for a stronger hierarchy of waterways,
  // green space, districts and the roads that help visitors orient themselves.
  paint('background', 'background-color', '#f7f9f6')
  paint('landuse-residential', 'fill-color', '#eff3f0')
  paint('landuse-commercial', 'fill-color', '#f6ede8')
  paint('park', 'fill-color', '#cde9c8')
  paint('park', 'fill-opacity', 0.78)
  paint('landcover-grass', 'fill-color', '#dcefd5')
  paint('landcover-grass-park', 'fill-color', '#cde9c8')
  paint('landcover-wood', 'fill-color', '#a9d6a4')
  paint('landcover-wood', 'fill-opacity', 0.38)
  paint('water', 'fill-color', '#b9def2')
  paint('waterway-river', 'line-color', '#95cbe7')
  paint('waterway-stream-canal', 'line-color', '#a8d5eb')

  for (const id of ['highway-secondary-tertiary-casing', 'bridge-secondary-tertiary-casing']) paint(id, 'line-color', '#e4d8bf')
  for (const id of ['highway-secondary-tertiary', 'bridge-secondary-tertiary']) paint(id, 'line-color', '#fff4d9')
  for (const id of ['highway-primary-casing', 'bridge-trunk-primary-casing', 'highway-trunk-casing']) paint(id, 'line-color', '#d9aa70')
  for (const id of ['highway-primary', 'highway-trunk', 'bridge-trunk-primary']) paint(id, 'line-color', '#ffe2aa')
  for (const id of ['highway-motorway', 'bridge-motorway']) paint(id, 'line-color', '#f8cc8a')
  paint('highway-minor-casing', 'line-color', '#d6dddc')
  paint('boundary_3', 'line-color', '#a7b8ad')

  layout('label_other', 'text-font', ['Noto Sans Regular'])
  layout('label_other', 'text-transform', 'none')
  layout('label_other', 'text-letter-spacing', 0)
  if (map.getLayer('label_other')) map.setLayoutProperty('label_other', 'text-size',
    ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 11.5, 14, 12.5])
  paint('label_other', 'text-color', '#617184')
  paint('label_other', 'text-halo-width', 1.5)
  paint('label_city', 'text-color', '#233d53')
  paint('label_town', 'text-color', '#385269')
  paint('label_village', 'text-color', '#536b7d')
  paint('highway-name-major', 'text-color', '#596b77')
  paint('highway-name-major', 'text-halo-width', 1.5)
  paint('water_name_point_label', 'text-color', '#477f9d')
  paint('water_name_line_label', 'text-color', '#477f9d')
}

export function enhanceMapStyle(map: Map, variant: MapStyle = 'bright') {
  const style = map.getStyle()
  if (!style?.layers || !map.getSource('openmaptiles')) return

  for (const layer of style.layers) {
    if (layer.type !== 'symbol' || !layer.layout?.['text-field']) continue
    if (JSON.stringify(layer.layout['text-field']).includes('name')) {
      map.setLayoutProperty(layer.id, 'text-field', placeName)
    }
  }

  if (variant === 'bright') enhanceOverview(map)

  if (map.getLayer('landuse-school')) map.setPaintProperty('landuse-school', 'fill-color', '#e9f2dd')
  if (map.getLayer('landuse-hospital')) map.setPaintProperty('landuse-hospital', 'fill-color', '#fce8e7')

  map.addLayer({
    id: 'roomrum-essential-places',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 14,
    filter: ['all', ['has', 'name'], essentialPlace] as FilterSpecification,
    layout: {
      'icon-image': ['match', ['get', 'class'],
        'school', 'school', 'college', 'college', 'hospital', 'hospital',
        'pharmacy', 'pharmacy',
        ['match', ['get', 'subclass'], 'pharmacy', 'pharmacy', 'hospital']],
      'icon-size': 0.82,
      'icon-allow-overlap': false,
      'text-field': placeName,
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11.5, 17, 13],
      'text-max-width': 10,
      'text-anchor': 'top',
      'text-offset': [0, 0.8],
    },
    paint: {
      'text-color': '#304861',
      'text-halo-color': '#fff',
      'text-halo-width': 1.6,
    },
  })

  // A ranked set of local services remains readable across all three vector
  // styles, including Positron, which does not ship any POI labels of its own.
  {
    const localPlace = (id: string, minzoom: number, minRank: number, maxRank: number): SymbolLayerSpecification => ({
      id,
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom,
      filter: ['all', ['has', 'name'], ['>=', ['get', 'rank'], minRank],
        ['<', ['get', 'rank'], maxRank], ['match', ['get', 'class'],
          ['cafe', 'restaurant', 'fast_food', 'grocery', 'shop', 'library', 'park'], true, false]] as FilterSpecification,
      layout: {
        'icon-image': ['match', ['get', 'class'],
          ['cafe', 'restaurant', 'fast_food', 'grocery', 'shop', 'library', 'park'],
          ['get', 'class'], 'shop'],
        'icon-size': 0.72,
        'text-field': placeName,
        'text-font': ['Noto Sans Regular'],
        'text-size': 11.5,
        'text-max-width': 9,
        'text-anchor': 'top',
        'text-offset': [0, 0.7],
      },
      paint: { 'text-color': '#536477', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
    })
    map.addLayer(localPlace('roomrum-local-places', 15, 1, 80))
    map.addLayer(localPlace('roomrum-nearby-places', 16, 80, 200))
    map.addLayer(localPlace('roomrum-street-places', 17, 200, 10000))
  }
}
