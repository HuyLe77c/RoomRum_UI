import { useEffect, useRef } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

export function useChatUpdates(token: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!token) return
    const connection = new HubConnectionBuilder()
      .withUrl('/api/chat/hub', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build()

    connection.on('ChatChanged', () => onChangeRef.current())
    connection.onreconnected(() => onChangeRef.current())
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const start = () => {
      void connection.start().then(() => {
        if (!stopped) onChangeRef.current()
      }).catch(error => {
        if (stopped) return
        console.error('Không thể kết nối tin nhắn thời gian thực.', error)
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
  }, [token])
}
