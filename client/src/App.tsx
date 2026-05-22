import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('检查中…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { status: string; timestamp: number }) => {
        setStatus(`后端已连通 — ${new Date(d.timestamp).toLocaleTimeString('zh-CN')}`);
      })
      .catch(() => setStatus('后端未响应，请确认 server 已启动'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl">🍅</div>
        <h1 className="text-2xl font-semibold tracking-tight">GTD 工作流</h1>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {status}
        </p>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Stage 1 scaffold — 骨架搭建完成
        </p>
      </div>
    </div>
  );
}
