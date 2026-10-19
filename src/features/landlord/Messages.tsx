import { useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, useAuth, useResource } from '../../shared/ui'
import type { Conversation, Message, Tenancy } from '../../shared/types'
import { Heading, Feedback } from './shared'

export function LandlordMessages() {
  const { session } = useAuth()
  const conversations = useResource<Conversation[]>('/chat/conversations?page=1&pageSize=100')
  const tenancies = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=100')
  const [active, setActive] = useState<string | null>(null)
  const messages = useResource<Message[]>(active ? `/chat/conversations/${active}/messages?page=1&pageSize=100` : null)
  const [receiver, setReceiver] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const chosen = conversations.data?.find(item => item.conversationId === active)
  const choose = (item: Conversation) => { setActive(item.conversationId); setReceiver(item.otherUserId || ''); setNotice(''); setProblem('') }
  const start = () => { setActive(null); setReceiver(''); setContent(''); setNotice(''); setProblem('') }
  const send = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setProblem(''); try { const result = await api<{ conversationId: string }>('/chat/messages', json('POST', { conversationId: active, receiver: receiver.trim(), content: content.trim() })); setActive(result.conversationId); setContent(''); setNotice('Đã gửi tin nhắn.'); conversations.reload(); messages.reload() } catch (cause) { setProblem((cause as Error).message) } finally { setBusy(false) } }
  return <><Heading title="Tin nhắn" description="Trao đổi với người quan tâm và người thuê trong tài khoản RoomRum." action={<button className="button button-secondary" onClick={start}><Plus size={16} /> Tin nhắn mới</button>} /><Feedback message={notice} /><Feedback message={problem} error /><div className="messages-layout landlord-messages"><div className="panel conversations"><h2>Cuộc trò chuyện</h2>{conversations.loading ? <Loading /> : conversations.error ? <ErrorState message={conversations.error} retry={conversations.reload} /> : conversations.data?.length ? conversations.data.map(item => <button className={active === item.conversationId ? 'conversation active' : 'conversation'} key={item.conversationId} onClick={() => choose(item)}><MessageCircle size={21} /><span><strong>{item.otherUserName || `Tài khoản ${item.otherUserId?.slice(0, 8) || 'RoomRum'}…`}</strong><small>{item.lastMessage?.content || 'Chưa có tin nhắn'}</small></span></button>) : <State title="Chưa có cuộc trò chuyện" description="Bạn có thể bắt đầu tin nhắn mới." />}</div><div className="panel message-thread"><h2>{active ? chosen?.otherUserName || 'Cuộc trò chuyện' : 'Tin nhắn mới'}</h2><div className="message-scroll">{active ? messages.loading ? <Loading /> : messages.error ? <ErrorState message={messages.error} retry={messages.reload} /> : messages.data?.length ? messages.data.map(item => <div key={item.messageId} className={item.sender === session?.userId ? 'bubble own' : 'bubble'}><p>{item.content}</p><small>{item.chatAt ? new Date(item.chatAt).toLocaleString('vi-VN') : ''}</small></div>) : <State title="Chưa có tin nhắn" /> : <State title="Chọn cuộc trò chuyện hoặc tạo tin nhắn mới" description="Người nhận cần có tài khoản RoomRum." />}</div><form className="message-form landlord-message-form" onSubmit={send}><label>Người nhận{active ? <input required value={chosen?.otherUserName || receiver} readOnly /> : <><select value={receiver} onChange={e => setReceiver(e.target.value)}><option value="">Chọn người thuê (nếu có)</option>{tenancies.data?.map(item => <option key={`${item.roomId}-${item.userId}`} value={item.userId}>{item.tenantName} · {item.roomTitle || "Phòng trọ"}</option>)}</select><input required pattern="[0-9a-fA-F-]{36}" title="Nhập mã GUID 36 ký tự" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Hoặc nhập ID tài khoản" /></>}</label><label>Nội dung<input required value={content} onChange={e => setContent(e.target.value)} placeholder="Nhập tin nhắn…" /></label><button className="button button-primary" type="submit" disabled={busy || !receiver}>{busy ? 'Đang gửi…' : 'Gửi'}</button></form></div></div></>
}
