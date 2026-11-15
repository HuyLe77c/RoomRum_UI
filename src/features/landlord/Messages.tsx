import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, Send, User } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, useAuth, useResource } from '../../shared/ui'
import type { Appointment, Conversation, Message, Tenancy } from '../../shared/types'
import { Heading, Feedback } from './shared'
import { useChatUpdates } from '../../shared/hooks/useChatUpdates'

type ContactOption = {
  userId: string
  name: string
  subtitle: string
}

export function LandlordMessages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramUserId = searchParams.get('userId') || ''
  const paramName = searchParams.get('name') || ''
  const paramRoom = searchParams.get('room') || ''

  const { session } = useAuth()
  const conversations = useResource<Conversation[]>('/chat/conversations?page=1&pageSize=100')
  const tenancies = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=100')
  const appointments = useResource<Appointment[]>('/appointments/mine?page=1&pageSize=100')

  const [active, setActive] = useState<string | null>(null)
  const [isNewChat, setIsNewChat] = useState(Boolean(paramUserId))
  const [receiver, setReceiver] = useState(paramUserId)
  const [receiverName, setReceiverName] = useState(paramName)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const messages = useResource<Message[]>(
    active ? `/chat/conversations/${active}/messages?page=1&pageSize=100` : null
  )

  useChatUpdates(session?.token, () => {
    conversations.reload()
    if (active) messages.reload()
  })

  const chosen = useMemo(
    () => conversations.data?.find(item => item.conversationId === active) || null,
    [conversations.data, active]
  )

  const contactOptions = useMemo<ContactOption[]>(() => {
    const map = new Map<string, ContactOption>()
    const myId = session?.userId?.toLowerCase()

    if (paramUserId && paramUserId.toLowerCase() !== myId) {
      map.set(paramUserId.toLowerCase(), {
        userId: paramUserId,
        name: paramName || 'Khách thuê',
        subtitle: paramRoom ? `Phòng: ${paramRoom}` : 'Liên hệ trực tiếp'
      })
    }

    for (const item of tenancies.data || []) {
      if (item.userId && item.userId.toLowerCase() !== myId && !map.has(item.userId.toLowerCase())) {
        map.set(item.userId.toLowerCase(), {
          userId: item.userId,
          name: item.tenantName || 'Người thuê',
          subtitle: `Thuê phòng: ${item.roomTitle || 'Phòng trọ'}`
        })
      }
    }

    for (const appt of appointments.data || []) {
      if (appt.userId && appt.userId.toLowerCase() !== myId && !map.has(appt.userId.toLowerCase())) {
        map.set(appt.userId.toLowerCase(), {
          userId: appt.userId,
          name: appt.guestName || 'Khách hẹn xem phòng',
          subtitle: `Hẹn xem: ${appt.roomTitle || 'Phòng trọ'}`
        })
      }
    }

    for (const conv of conversations.data || []) {
      if (conv.otherUserId && conv.otherUserId.toLowerCase() !== myId && !map.has(conv.otherUserId.toLowerCase())) {
        map.set(conv.otherUserId.toLowerCase(), {
          userId: conv.otherUserId,
          name: conv.otherUserName || 'Tài khoản RoomRum',
          subtitle: 'Đã từng trò chuyện'
        })
      }
    }

    return Array.from(map.values())
  }, [paramUserId, paramName, paramRoom, tenancies.data, appointments.data, conversations.data, session?.userId])

  useEffect(() => {
    if (!conversations.data) return

    if (paramUserId) {
      const existing = conversations.data.find(
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
        setReceiverName(paramName || 'Khách thuê')
        setIsNewChat(true)
      }
      return
    }

    if (!active && !isNewChat && conversations.data.length > 0) {
      const first = conversations.data[0]
      setActive(first.conversationId)
      setReceiver(first.otherUserId || '')
      setReceiverName(first.otherUserName || '')
    }
  }, [conversations.data, paramUserId, paramName])

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
    setProblem('')
    if (paramUserId) setSearchParams({})
  }

  const start = () => {
    setActive(null)
    setIsNewChat(true)
    setReceiver('')
    setReceiverName('')
    setContent('')
    setNotice('')
    setProblem('')
    if (paramUserId) setSearchParams({})
  }

  const handleSelectContact = (selectedUserId: string) => {
    if (!selectedUserId) {
      setReceiver('')
      setReceiverName('')
      return
    }
    const existing = conversations.data?.find(
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
    setReceiverName(contact?.name || 'Khách thuê')
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const targetReceiver = (active ? chosen?.otherUserId || receiver : receiver).trim()
    const trimmedContent = content.trim()
    if (!targetReceiver || !trimmedContent) return

    setBusy(true)
    setProblem('')
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
        conversations.reload()
      } else {
        const updatedList = await api<Conversation[]>('/chat/conversations?page=1&pageSize=100')
        const found = updatedList?.find(
          item => item.otherUserId?.toLowerCase() === targetReceiver.toLowerCase()
        )
        conversations.reload()
        if (found) {
          setActive(found.conversationId)
          setReceiver(found.otherUserId || targetReceiver)
          setReceiverName(found.otherUserName || receiverName)
          setIsNewChat(false)
          if (paramUserId) setSearchParams({})
        }
      }
    } catch (cause) {
      setProblem((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const activeTitle = active
    ? chosen?.otherUserName || 'Cuộc trò chuyện'
    : receiverName || 'Tin nhắn mới'

  const canSend = Boolean((active ? chosen?.otherUserId || receiver : receiver) && content.trim() && !busy)

  return (
    <>
      <Heading
        title="Tin nhắn"
        description="Trao đổi với người quan tâm và người thuê trong tài khoản RoomRum."
        action={
          <button type="button" className="button button-secondary" onClick={start}>
            <Plus size={16} /> Tin nhắn mới
          </button>
        }
      />
      <Feedback message={notice} />
      <Feedback message={problem} error />

      <div className="messages-layout landlord-messages">
        <div className="panel conversations">
          <div className="conversations-head">
            <h2>Cuộc trò chuyện</h2>
          </div>

          {conversations.loading ? (
            <Loading />
          ) : conversations.error ? (
            <ErrorState message={conversations.error} retry={conversations.reload} />
          ) : conversations.data?.length ? (
            <div className="conversation-list">
              {conversations.data.map(item => {
                const displayName = item.otherUserName || `Tài khoản ${item.otherUserId?.slice(0, 6) || 'RoomRum'}`
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
          ) : (
            <State title="Chưa có cuộc trò chuyện" description="Bạn có thể bắt đầu tin nhắn mới." />
          )}
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
                      ? `Phòng: ${paramRoom}`
                      : 'Chọn người thuê hoặc khách hẹn xem phòng'}
                </small>
              </div>
            </div>

            {!active && (
              <div className="thread-recipient-picker">
                {paramUserId ? (
                  <div className="recipient-badge">
                    <User size={14} />
                    <span>Người nhận: <strong>{receiverName || 'Khách thuê'}</strong></span>
                    <button type="button" className="recipient-change-btn" onClick={start}>
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
                      <option value="">-- Chọn người thuê / khách đặt lịch --</option>
                      {contactOptions.map(c => (
                        <option key={c.userId} value={c.userId}>
                          {c.name} · {c.subtitle}
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
              ) : messages.error ? (
                <ErrorState message={messages.error} retry={messages.reload} />
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
                <State title="Chưa có tin nhắn" />
              )
            ) : receiver ? (
              <State
                title={`Bắt đầu trò chuyện với ${receiverName || 'khách thuê'}`}
                description="Nhập nội dung tin nhắn ở khung bên dưới để gửi."
              />
            ) : (
              <State
                title="Chọn cuộc trò chuyện hoặc người nhận"
                description="Chọn người thuê hoặc khách đặt lịch hẹn ở danh sách phía trên để nhắn tin."
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
