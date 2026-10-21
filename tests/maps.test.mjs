import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMapPoint } from '../src/features/maps/mapCoordinates.ts'
import { clusterRooms } from '../src/features/maps/clusterRooms.ts'

test('map coordinates accept valid points without turning empty values into 0,0', () => {
  assert.deepEqual(parseMapPoint('10.7769', '106.7009'), [10.7769, 106.7009])
  assert.deepEqual(parseMapPoint('0', '0'), [0, 0])
  for (const [lat, lon] of [[null, null], ['', ''], [' ', '106.7'], ['abc', '106.7'],
    ['91', '106.7'], ['10.7', '181'], ['Infinity', '106.7']]) {
    assert.equal(parseMapPoint(lat, lon), null)
  }
})

test('nearby rooms cluster at overview zoom and separate when zooming in', () => {
  const rooms = [
    { roomId: 'a', latitude: 10.7769, longitude: 106.7009 },
    { roomId: 'b', latitude: 10.778, longitude: 106.705 },
  ]
  const overview = clusterRooms(rooms, 8)
  assert.equal(overview.length, 1)
  assert.equal(overview[0].rooms.length, 2)
  const street = clusterRooms(rooms, 18)
  assert.equal(street.length, 2)
  assert.deepEqual(street.flatMap(group => group.rooms.map(room => room.roomId)).sort(), ['a', 'b'])
})
