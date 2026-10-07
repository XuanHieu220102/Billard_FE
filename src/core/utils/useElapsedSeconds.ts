import { useEffect, useState } from 'react';

// Đếm số giây trôi qua kể từ startTime, cập nhật mỗi giây. Dùng chung cho
// Dashboard (UC-01) và màn phiên chơi (UC-07) để tính tạm ứng tiền giờ chơi.
export function useElapsedSeconds(startTime: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!startTime) return 0;
  const elapsedMs = now - new Date(startTime).getTime();
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
