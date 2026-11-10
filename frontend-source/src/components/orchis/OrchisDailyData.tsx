import type { TimeSeriesData } from '@/routes/home/types'

export function OrchisDailyData({ rows }: { rows: TimeSeriesData[] }) {
  const download = () => {
    const csv = '\uFEFF时间,请求数,输入Token,输出Token,花费\r\n' + rows.map(row=>[
      new Date(row.timestamp).toISOString(),row.requests,row.input_tokens,row.output_tokens,row.cost,
    ].join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const anchor=document.createElement('a')
    anchor.href=url;anchor.download='maibot-statistics.csv';anchor.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <details className="orchis-daily-details">
    <summary>数据明细与导出</summary>
    <button type="button" onClick={download}>导出当前范围 CSV ↓</button>
    <div className="overflow-x-auto"><table><thead><tr><th>时间</th><th>请求</th><th>输入 Token</th><th>输出 Token</th><th>花费</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.timestamp}><td>{new Date(row.timestamp).toLocaleString()}</td><td>{row.requests}</td><td>{row.input_tokens}</td><td>{row.output_tokens}</td><td>¥{row.cost.toFixed(4)}</td></tr>)}</tbody>
    </table></div>
  </details>
}
