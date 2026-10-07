import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReportSummary } from './reportApi';
import type { ReportPeriod } from '../../core/api/types';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
];

function formatCurrency(value: string | number): string {
  return `${Math.round(Number(value)).toLocaleString('vi-VN')}đ`;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>('LAST_7_DAYS');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary', period],
    queryFn: () => getReportSummary(period),
  });

  // Chỉ hiển thị các khung giờ hoạt động thực tế trong ngày (6h-24h), gộp 2 tiếng/khung cho gọn.
  const hourlyBuckets: { label: string; count: number }[] = [];
  if (summary) {
    for (let hour = 6; hour < 24; hour += 2) {
      const count =
        (summary.sessionsByHour.find((h) => h.hourOfDay === hour)?.sessionCount ?? 0) +
        (summary.sessionsByHour.find((h) => h.hourOfDay === hour + 1)?.sessionCount ?? 0);
      hourlyBuckets.push({ label: `${String(hour).padStart(2, '0')}h`, count });
    }
  }
  const maxBucketCount = Math.max(1, ...hourlyBuckets.map((b) => b.count));

  const foodDrinkShareOfTotal =
    summary && Number(summary.totalRevenue) > 0
      ? (Number(summary.foodDrinkRevenue) / Number(summary.totalRevenue)) * 100
      : 0;

  return (
    <div className="report-page">
      <header>
        <button onClick={() => navigate('/dashboard')}>←</button>
        <div>
          <h1>Dashboard Thống Kê</h1>
          <span className="report-page__subtitle">Báo cáo hiệu suất hoạt động &amp; doanh thu dịch vụ</span>
        </div>
      </header>

      <div className="tabs tabs--block report-page__period">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={period === opt.value ? 'active' : ''}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <p>Đang tải...</p>}

      {summary && (
        <>
          <div className="report-summary-grid">
            <div className="report-stat-card">
              <span className="report-stat-card__label">Tổng Doanh Thu</span>
              <strong className="report-stat-card__value">{formatCurrency(summary.totalRevenue)}</strong>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card__label">Tiền Giờ Chơi</span>
              <strong className="report-stat-card__value">{formatCurrency(summary.tableRevenue)}</strong>
              <span className="report-stat-card__hint">
                Chiếm {Math.round(100 - foodDrinkShareOfTotal)}% tổng thu
              </span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card__label">Doanh Thu F&amp;B</span>
              <strong className="report-stat-card__value">{formatCurrency(summary.foodDrinkRevenue)}</strong>
              <span className="report-stat-card__hint">Dịch vụ đồ ăn &amp; nước uống</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card__label">Tổng Số Phiên Chơi</span>
              <strong className="report-stat-card__value">{summary.totalSessions}</strong>
              <span className="report-stat-card__hint">Phiên đã hoàn tất trong kỳ</span>
            </div>
          </div>

          <div className="report-detail-grid">
            <div className="report-panel">
              <h2>Số Phiên Chơi Theo Khung Giờ</h2>
              <p className="report-panel__subtitle">Khung giờ cao điểm trong ngày</p>
              <div className="report-bar-chart">
                {hourlyBuckets.map((bucket) => (
                  <div className="report-bar-chart__col" key={bucket.label}>
                    <div className="report-bar-chart__track">
                      <div
                        className="report-bar-chart__bar"
                        style={{ height: `${(bucket.count / maxBucketCount) * 100}%` }}
                        title={`${bucket.count} phiên`}
                      />
                    </div>
                    <span className="report-bar-chart__label">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-panel">
              <h2>Top Dịch Vụ F&amp;B</h2>
              <p className="report-panel__subtitle">Mặt hàng tiêu thụ nhiều nhất</p>
              {summary.topFoodDrinkItems.length === 0 && (
                <p className="table-manage-empty">Chưa có dữ liệu đồ ăn/nước uống trong kỳ.</p>
              )}
              <div className="report-top-items">
                {summary.topFoodDrinkItems.map((item) => (
                  <div className="report-top-item" key={item.itemName}>
                    <div className="report-top-item__header">
                      <span className="report-top-item__name">
                        {item.itemName} <span className="report-top-item__qty">({item.totalQuantity})</span>
                      </span>
                      <span className="report-top-item__amount">
                        {formatCurrency(item.totalRevenue)} ({item.revenueSharePercent}%)
                      </span>
                    </div>
                    <div className="report-top-item__bar-track">
                      <div
                        className="report-top-item__bar"
                        style={{ width: `${Math.min(100, Number(item.revenueSharePercent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
