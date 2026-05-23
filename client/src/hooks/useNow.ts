import { useState, useEffect } from 'react';

/**
 * 返回响应式的当前时间 Date，每分钟刷新一次。
 * 先对齐到下一整分钟，再每 60s 更新，减少不必要的渲染。
 * 组件卸载时自动清除所有定时器。
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Align to the next full minute boundary for efficiency
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return now;
}
