import { useContext, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { NativeHomeContext } from './OrchisNativeCards'
import { OrchisFrame, OrchisIcon } from './OrchisPrimitives'
import { chatWsClient } from '@/lib/chat-ws-client'
import { getStoredUserName, INTERNAL_CHAT_USER_ID } from '@/routes/chat/utils'

const SESSION = 'webui-default'
type PreviewMessage = { key: string; content: string; bot: boolean }
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

/** Uses the same private owner session and restore/release lifecycle as the full chat. */
export function OrchisQuickChat() {
  const [userName] = useState(getStoredUserName)
  const [botName, setBotName] = useState('麦麦')
  const [messages, setMessages] = useState<PreviewMessage[]>([])
  const [connected, setConnected] = useState(false)
  const shared = useContext(NativeHomeContext)
  const [localBusy, setLocalBusy] = useState(false)
  const busy = shared?.chatPending ?? localBusy
  const setBusy = shared?.setChatPending ?? setLocalBusy
  const [localDraft, setLocalDraft] = useState('')
  const draft = shared?.chatDraft ?? localDraft
  const setDraft = shared?.setChatDraft ?? setLocalDraft
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const thread = useRef<HTMLDivElement>(null)
  const localRevision = useRef(0)
  const draftRevision = shared?.chatDraftRevision ?? localRevision

  useEffect(() => {
    let cancelled = false
    let opened = false
    const unsubscribe = chatWsClient.onSessionMessage(SESSION, (data) => {
      if (cancelled) return
      if (data.type === 'session_info') {
        if (typeof data.bot_name === 'string' && data.bot_name.trim()) setBotName(data.bot_name)
      } else if (data.type === 'history' && Array.isArray(data.messages)) {
        setMessages(
          data.messages.slice(-12).map((value, index) => {
            const message = record(value)
            return {
              key: String(message.id ?? index),
              content: String(message.content ?? '[图片或附件]'),
              bot: message.is_bot === true,
            }
          })
        )
      } else if (data.type === 'user_message' || data.type === 'bot_message') {
        const content = String(data.content ?? '[图片或附件]')
        const key = String(data.message_id ?? `${data.type}-${data.timestamp}-${content}`)
        setMessages((previous) =>
          previous.some((message) => message.key === key)
            ? previous
            : [...previous, { key, content, bot: data.type === 'bot_message' }].slice(-12)
        )
      } else if (data.type === 'error') {
        setError(String(data.content ?? data.message ?? '暂时无法发送消息'))
      }
    })
    const disconnect = chatWsClient.onConnectionChange((value) => {
      if (!cancelled) setConnected(opened && value)
    })
    void chatWsClient
      .openSession(SESSION, {
        client: { type: 'webui', name: 'MaiBot WebUI' },
        user_id: INTERNAL_CHAT_USER_ID,
        user_name: userName,
      })
      .then(() => {
        opened = true
        if (!cancelled) {
          setConnected(true)
          setError('')
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '聊天连接失败')
      })
    return () => {
      cancelled = true
      unsubscribe()
      disconnect()
      chatWsClient.releaseSession(SESSION)
    }
  }, [userName, attempt])

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight
  }, [messages])

  async function send() {
    const content = draft.trim()
    if (!connected || busy || !content) return
    const submittedRevision = draftRevision.current
    setBusy(true)
    setError('')
    try {
      await chatWsClient.sendMessage(SESSION, content, userName)
      if (draftRevision.current === submittedRevision) setDraft('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '发送失败，草稿已保留')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card chat-card" data-frame="table" aria-labelledby="orchis-chat-title">
      <OrchisFrame family="table" />
      <div className="card-heading">
        <h2 id="orchis-chat-title">
          <OrchisIcon name="chat" />
          即时对话
        </h2>
        <Link to="/chat" className="text-button">
          完整聊天 ↗
        </Link>
      </div>
      <div className="chat-status">
        <i className="status-led" />
        {connected ? `已连接 · ${botName}` : '正在连接…'}
      </div>
      <div className="messages" ref={thread} aria-label="即时聊天记录" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <article key={message.key} className={message.bot ? 'message' : 'message user'}>
              <span className="message-avatar" aria-label={message.bot ? botName : userName}>
                {message.bot ? '麦' : '我'}
              </span>
              <div className="message-body">{message.content || '[图片或附件]'}</div>
            </article>
          ))
        ) : (
          <p className="detail-note">{connected ? '从一句简单的问候开始。' : '等待聊天连接。'}</p>
        )}
      </div>
      {error && (
        <div className="orchis-chat-error" role="alert">
          {error}
          {!connected && <button onClick={() => setAttempt((value) => value + 1)}>重试连接</button>}
        </div>
      )}
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <label className="sr-only" htmlFor="orchis-message-input">
          输入消息
        </label>
        <textarea
          rows={1}
          id="orchis-message-input"
          value={draft}
          maxLength={2000}
          onChange={(event) => {
            draftRevision.current += 1
            setDraft(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send()
            }
          }}
          placeholder="写下想说的话…"
        />
        <button
          className="send-button"
          type="submit"
          disabled={!connected || busy || !draft.trim()}
          aria-label="发送消息"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  )
}
