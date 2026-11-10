import { LloydDots } from './LloydDots'
import { OrchisPanel } from './OrchisPrimitives'

export function OrchisStatusFace({
  state,
  evolved,
  uptime,
  memory,
  visual,
}: {
  state: 'loading' | 'running' | 'stopped' | 'unknown'
  evolved: boolean
  uptime: number | null
  memory: boolean
  visual: boolean
}) {
  const label = {
    loading: '正在读取',
    running: '正在活动',
    stopped: '已停止',
    unknown: '状态未知',
  }[state]
  return (
    <OrchisPanel
      title="麦麦的状态"
      className="bot-card"
      actions={<span className="tiny-label">MAIBOT</span>}
    >
      <div className="bot-status">
        <LloydDots state={state} evolved={evolved} />
        <div>
          <strong>{label}</strong>
          <p>
            <i className="status-led" />
            运行时长{' '}
            <b>
              {uptime === null
                ? '—'
                : `${Math.floor(uptime / 3600)} 小时 ${Math.floor((uptime % 3600) / 60)} 分`}
            </b>
          </p>
        </div>
      </div>
      <div className="status-options" aria-label="功能启用状态">
        {[
          ['启用视觉', visual],
          ['启用记忆', memory],
        ].map(([label, enabled]) => (
          <div
            className="feature-status"
            role="status"
            key={String(label)}
            data-enabled={String(enabled)}
            aria-label={`${label}：${enabled ? '已启用' : '未启用'}`}
          >
            <span className="feature-status-light" aria-hidden="true" />
            <span className="feature-status-label">{label}</span>
          </div>
        ))}
      </div>
    </OrchisPanel>
  )
}
