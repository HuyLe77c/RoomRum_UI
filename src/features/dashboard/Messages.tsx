import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, Send, User } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { Loading, State, useAuth, useResource } from '../../shared/ui'
import type { Conversation, Message, RoomSearch, Sharing } from '../../shared/types'
import { Heading, Notice, DataPanel } from './shared'

type ContactOption = {
  userId: string
  name: string
  subtitle: string
}

export function Messages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramUserId = searchParams.get('userId') || ''
  const paramName = searchParams.get('name') || ''
  const paramRoom = searchParams.get('room') || ''

  const { session } = useAuth()
  const resource = useResource<Conversation[]>('/chat/conversations?page=1&pageSize=50')
  const rooms = useResource<RoomSearch>('/rooms?page=1&pageSize=50')
  const sharings = useResource<Sharing[]>('/sharings?page=1&pageSize=50')

  const [active, setActive] = useState<string | null>(null)
  const [isNewChat, setIsNewChat] = useState(Boolean(paramUserId))
  const [receiver, setReceiver] = useState(paramUserId)
  const [receiverName, setReceiverName] = useState(paramName)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const messages = useResource<Message[]>(
    active ? `/chat/conversations/${active}/messages?page=1&pageSize=50` : null
  )

  const chosen = useMemo(
    () => resource.data?.find(item => item.conversationId === active) || null,
    [resource.data, active]
  )

  // Danh sách gợi ý liên hệ (Chủ phòng & Người đăng tin ở ghép) khi tạo cuộc trò chuyện mới
  const contactOptions = useMemo<ContactOption[]>(() => {
    const map = new Map<string, ContactOption>()
    const myId = session?.userId?.toLowerCase()

    if (paramUserId && paramUserId.toLowerCase() !== myId) {
      map.set(paramUserId.toLowerCase(), {
        userId: paramUserId,
        name: paramName || 'Người dùng RoomRum',
        subtitle: paramRoom ? `Quan tâm: ${paramRoom}` : 'Liên hệ trực tiếp'
      })
    }

    for (const conv of resource.data || []) {
      if (conv.otherUserId && conv.otherUserId.toLowerCase() !== myId) {
        map.set(conv.otherUserId.toLowerCase(), {
          userId: conv.otherUserId,
          name: conv.otherUserName || 'Người dùng RoomRum',
          subtitle: 'Đã có cuộc trò chuyện'
        })
      }
    }

    for (const s of sharings.data || []) {
      if (s.userId && s.userId.toLowerCase() !== myId && !map.has(s.userId.toLowerCase())) {
        map.set(s.userId.toLowerCase(), {
          userId: s.userId,
          name: s.author || 'Người thuê đăng tin',
          subtitle: `Ở ghép: ${s.title || s.roomTitle || 'Phòng trọ'}`
        })
      }
    }

    for (const r of rooms.data?.items || []) {
      if (r.userId && r.userId.toLowerCase() !== myId && !map.has(r.userId.toLowerCase())) {
        map.set(r.userId.toLowerCase(), {
          userId: r.userId,
          name: `Chủ phòng: ${r.title || 'Phòng trọ'}`,
          subtitle: r.address || 'Liên hệ hỏi phòng'
        })
      }
    }

    return Array.from(map.values())
  }, [paramUserId, paramName, paramRoom, resource.data, sharings.data, rooms.data, session?.userId])

  // Tự động chọn cuộc trò chuyện khi dữ liệu tải xong hoặc khi có query ?userId=
  useEffect(() => {
    if (!resource.data) return

    if (paramUserId) {
      const existing = resource.data.find(
        item => item.otherUserId?.toLowerCase() === paramUserId.toLowerCase()
      )
      if (existing) {
        setActive(existing.conversationId)
        setReceiver(existing.otherUserId || paramUserId)
        setReceiverName(existing.otherUserName || paramName)
        setIsNewChat(false)
      } else {
        setActive(null)
        setReceiver(paramUserId)
        setReceiverName(paramName || 'Người nhận')
        setIsNewChat(true)
      }
      return
    }

    if (!active && !isNewChat && resource.data.length > 0) {
      const first = resource.data[0]
      setActive(first.conversationId)
      setReceiver(first.otherUserId || '')
      setReceiverName(first.otherUserName || '')
    }
  }, [resource.data, paramUserId, paramName])

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.data, active])

  const choose = (item: Conversation) => {
    setActive(item.conversationId)
    setReceiver(item.otherUserId || '')
    setReceiverName(item.otherUserName || '')
    setIsNewChat(false)
    setNotice('')
    if (paramUserId) setSearchParams({})
  }

  const startNewChat = () => {
    setActive(null)
    setIsNewChat(true)
    setReceiver('')
    setReceiverName('')
    setNotice('')
    if (paramUserId) setSearchParams({})
  }

  const handleSelectContact = (selectedUserId: string) => {
    if (!selectedUserId) {
      setReceiver('')
      setReceiverName('')
      return
    }
    const existing = resource.data?.find(
      item => item.otherUserId?.toLowerCase() === selectedUserId.toLowerCase()
    )
    if (existing) {
      choose(existing)
      return
    }
    const contact = contactOptions.find(
      c => c.userId.toLowerCase() === selectedUserId.toLowerCase()
    )
    setReceiver(selectedUserId)
    setReceiverName(contact?.name || 'Người nhận')
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const targetReceiver = (active ? chosen?.otherUserId || receiver : receiver).trim()
    const trimmedContent = content.trim()
    if (!targetReceiver || !trimmedContent) return

    setBusy(true)
    setNotice('')
    try {
      await api('/chat/messages', json('POST', {
        conversationId: active,
        receiver: targetReceiver,
        content: trimmedContent
      }))
      setContent('')

      if (active) {
        messages.reload()
        resource.reload()
      } else {
        const updatedList = await api<Conversation[]>('/chat/conversations?page=1&pageSize=50')
        const found = updatedList?.find(
          item => item.otherUserId?.toLowerCase() === targetReceiver.toLowerCase()
        )
        resource.reload()
        if (found) {
          setActive(found.conversationId)
          setReceiver(found.otherUserId || targetReceiver)
          setReceiverName(found.otherUserName || receiverName)
          setIsNewChat(false)
          if (paramUserId) setSearchParams({})
        }
      }
    } catch (cause) {
      setNotice((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const activeTitle = active
    ? chosen?.otherUserName || `Cuộc trò chuyện ${active.slice(0, 8)}…`
    : receiverName || 'Tin nhắn mới'

  const canSend = Boolean((active ? chosen?.otherUserId || receiver : receiver) && content.trim() && !busy)

  return (
    <>
      <Heading
        eyebrow="KẾT NỐI"
        title="Tin nhắn"
        description="Trao đổi trực tiếp với chủ phòng và cộng đồng RoomRum."
      />
      <Notice text={notice} />

      <div className="messages-layout">
        <div className="panel conversations">
          <div className="conversations-head">
            <h2>Cuộc trò chuyện</h2>
            <button
              type="button"
              className="button button-secondary small"
              onClick={startNewChat}
              title="Bắt đầu cuộc trò chuyện mới"
            >
              <Plus size={15} /> Mới
            </button>
          </div>

          <DataPanel resource={resource} empty="Chưa có cuộc trò chuyện">
            {data => (
              <div className="conversation-list">
                {data.map(item => {
                  const displayName = item.otherUserName || `Người dùng ${item.conversationId.slice(0, 6)}`
                  const initial = displayName.trim().charAt(0).toUpperCase()
                  return (
                    <button
                      type="button"
                      className={active === item.conversationId && !isNewChat ? 'conversation active' : 'conversation'}
                      key={item.conversationId}
                      onClick={() => choose(item)}
                    >
                      <div className="conversation-avatar">{initial}</div>
                      <span className="conversation-meta">
                        <div className="conversation-top">
                          <strong>{displayName}</strong>
                          {item.lastMessage?.chatAt && (
                            <time>
                              {new Date(item.lastMessage.chatAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </time>
                          )}
                        </div>
                        <small>{item.lastMessage?.content || 'Chưa có tin nhắn'}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </DataPanel>
        </div>

        <div className="panel message-thread">
          <div className="thread-header">
            <div className="thread-user">
              <div className="conversation-avatar large">
                {active || receiver ? activeTitle.trim().charAt(0).toUpperCase() : <MessageCircle size={18} />}
              </div>
              <div>
                <h2>{activeTitle}</h2>
                <small className="thread-subtitle">
                  {active
                    ? 'Đang trò chuyện trực tiếp'
                    : paramRoom
                      ? `Quan tâm: ${paramRoom}`
                      : 'Chọn người nhận để bắt đầu trò chuyện'}
                </small>
              </div>
            </div>

            {!active && (
              <div className="thread-recipient-picker">
                {paramUserId ? (
                  <div className="recipient-badge">
                    <User size={14} />
                    <span>Người nhận: <strong>{receiverName || 'Chủ phòng'}</strong></span>
                    <button
                      type="button"
                      className="recipient-change-btn"
                      onClick={startNewChat}
                    >
                      Đổi người nhận
                    </button>
                  </div>
                ) : (
                  <label className="recipient-select-label">
                    <span>Người nhận:</span>
                    <select
                      required
                      value={receiver}
                      onChange={e => handleSelectContact(e.target.value)}
                    >
                      <option value="">-- Chọn chủ phòng / người đăng tin --</option>
                      {contactOptions.map(c => (
                        <option key={c.userId} value={c.userId}>
                          {c.name} ({c.subtitle})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="message-scroll" ref={scrollRef}>
            {active ? (
              messages.loading ? (
                <Loading />
              ) : messages.data?.length ? (
                messages.data.map(item => (
                  <div
                    key={item.messageId}
                    className={item.sender === session?.userId ? 'bubble own' : 'bubble'}
                  >
                    <p>{item.content}</p>
                    <small>
                      {item.chatAt
                        ? new Date(item.chatAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })
                        : ''}
                    </small>
                  </div>
                ))
              ) : (
                <State title="Chưa có tin nhắn" description="Hãy gửi lời chào đầu tiên." />
              )
            ) : receiver ? (
              <State
                title={`Bắt đầu trò chuyện với ${receiverName || 'người nhận'}`}
                description={
                  paramRoom
                    ? `Nhập nội dung bên dưới để trao đổi về "${paramRoom}".`
                    : 'Nhập nội dung tin nhắn bên dưới và nhấn Gửi.'
                }
              />
            ) : (
              <State
                title="Chọn cuộc trò chuyện hoặc người nhận"
                description="Chọn một cuộc trò chuyện ở danh sách bên trái, hoặc chọn người nhận ở phía trên để bắt đầu."
              />
            )}
          </div>

          <form className="message-form clean-composer" onSubmit={send}>
            <input
              required
              className="composer-input"
              value={content}
              disabled={!active && !receiver}
              onChange={e => setContent(e.target.value)}
              placeholder={
                active || receiver
                  ? `Nhập tin nhắn gửi tới ${activeTitle}…`
                  : 'Vui lòng chọn cuộc trò chuyện hoặc người nhận trước…'
              }
            />
            <button
              className="button button-primary composer-send"
              type="submit"
              disabled={!canSend}
            >
              <Send size={16} />
              <span>{busy ? 'Đang gửi…' : 'Gửi'}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
