import { useEffect } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

export function useRoomUpdates() {
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('/api/rooms/hub')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build()
    const refresh = () => window.dispatchEvent(new Event('roomrum-rooms-updated'))
    connection.on('RoomsChanged', refresh)
    connection.onreconnected(refresh)
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const start = () => {
      void connection.start().then(() => {
        if (!stopped) refresh()
      }).catch(error => {
        if (stopped) return
        console.error('Không thể kết nối cập nhật phòng thời gian thực.', error)
        retry = setTimeout(start, 5000)
      })
    }
    connection.onclose(() => {
      if (!stopped) retry = setTimeout(start, 5000)
    })
    start()
    return () => {
      stopped = true
      clearTimeout(retry)
      void connection.stop()
    }
  }, [])
}
