import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chatWsClient } from '@/lib/chat-ws-client'
import { OrchisQuickChat } from './OrchisQuickChat'
import { useRef, useState } from 'react'
import { NativeHomeContext, type NativeHomeBusiness } from './OrchisNativeCards'

const listeners = vi.hoisted(() => ({
  message: null as null | ((data: Record<string, unknown>) => void),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('@/lib/chat-ws-client', () => ({
  chatWsClient: {
    openSession: vi.fn(),
    releaseSession: vi.fn(),
    sendMessage: vi.fn(),
    onConnectionChange: vi.fn(),
    onSessionMessage: vi.fn(),
  },
}))
beforeEach(() => {
  vi.mocked(chatWsClient.openSession).mockResolvedValue()
  vi.mocked(chatWsClient.sendMessage).mockResolvedValue()
  vi.mocked(chatWsClient.onConnectionChange).mockImplementation((listener) => {
    listener(true)
    return () => {}
  })
  vi.mocked(chatWsClient.onSessionMessage).mockImplementation((_id, listener) => {
    listeners.message = listener
    return () => {
      listeners.message = null
    }
  })
})
afterEach(cleanup)

describe('Orchis compact private chat', () => {
  it('keeps the send pending across region moves until acknowledgment', async () => {
    let acknowledge!: () => void
    vi.mocked(chatWsClient.sendMessage).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = resolve
        })
    )
    function MovingChat() {
      const [key, setKey] = useState(0),
        [draft, setDraft] = useState(''),
        [pending, setPending] = useState(false),
        revision = useRef(0)
      return (
        <NativeHomeContext.Provider
          value={
            {
              chatDraft: draft,
              setChatDraft: setDraft,
              chatDraftRevision: revision,
              chatPending: pending,
              setChatPending: setPending,
            } as unknown as NativeHomeBusiness
          }
        >
          <button onClick={() => setKey(key + 1)}>移动区域</button>
          <OrchisQuickChat key={key} />
        </NativeHomeContext.Provider>
      )
    }
    render(<MovingChat />)
    const input = screen.getByRole('textbox', { name: '输入消息' })
    fireEvent.change(input, { target: { value: '等待确认中的消息' } })
    await waitFor(() => expect(screen.getByRole('button', { name: '发送消息' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    fireEvent.click(screen.getByRole('button', { name: '移动区域' }))
    await waitFor(() => expect(screen.getByText(/已连接/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), {
      target: { value: '新区域里的第二条草稿' },
    })
    await act(async () => acknowledge())
    expect(screen.getByRole('textbox', { name: '输入消息' })).toHaveValue('新区域里的第二条草稿')
    expect(screen.getByRole('button', { name: '发送消息' })).toBeEnabled()
  })
  it('keeps new text composed while the submitted message is waiting for acknowledgment', async () => {
    let acknowledge!: () => void
    vi.mocked(chatWsClient.sendMessage).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = resolve
        })
    )
    render(<OrchisQuickChat />)
    const input = screen.getByRole('textbox', { name: '输入消息' })
    fireEvent.change(input, { target: { value: '第一条消息' } })
    await waitFor(() => expect(screen.getByRole('button', { name: '发送消息' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    fireEvent.change(input, { target: { value: '正在编辑的第二条' } })
    await act(async () => acknowledge())
    expect(input).toHaveValue('正在编辑的第二条')
  })
  it('uses the existing default private session, blocks empty messages, and releases on unmount', async () => {
    const view = render(<OrchisQuickChat />)
    await waitFor(() =>
      expect(chatWsClient.openSession).toHaveBeenCalledWith(
        'webui-default',
        expect.objectContaining({ user_id: 'owner' })
      )
    )
    const input = screen.getByRole('textbox', { name: '输入消息' })
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '你好，奥契丝' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() =>
      expect(chatWsClient.sendMessage).toHaveBeenCalledWith(
        'webui-default',
        '你好，奥契丝',
        expect.any(String)
      )
    )
    view.unmount()
    expect(chatWsClient.releaseSession).toHaveBeenCalledWith('webui-default')
  })
  it('renders server history and retains the draft on failed send', async () => {
    vi.mocked(chatWsClient.sendMessage).mockRejectedValue(new Error('暂时无法发送'))
    render(<OrchisQuickChat />)
    act(() =>
      listeners.message?.({
        type: 'history',
        messages: [{ id: 'a', content: '已有的真实记录', is_bot: true, timestamp: 1 }],
      })
    )
    expect(screen.getByText('已有的真实记录')).toBeInTheDocument()
    await waitFor(() => expect(chatWsClient.openSession).toHaveBeenCalled())
    fireEvent.change(screen.getByRole('textbox', { name: '输入消息' }), {
      target: { value: '保留这条草稿' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('暂时无法发送'))
    expect(screen.getByRole('textbox', { name: '输入消息' })).toHaveValue('保留这条草稿')
  })
})
