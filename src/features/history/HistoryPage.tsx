import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceHistory, getSessionHistory } from './historyApi';
import { HistoryDetailModal } from './HistoryDetailModal';
import type { Invoice, TableSession } from '../../core/api/types';

interface HistoryRow {
  session: TableSession;
  invoice: Invoice | undefined;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  return { from: toDateInputValue(sevenDaysAgo), to: toDateInputValue(today) };
}

function PaymentStatusBadge({ invoice }: { invoice: Invoice | undefined }) {
  if (!invoice) {
    return <span className="status-badge status-badge--occupied">Đang chơi</span>;
  }
  return (
    <span className={`status-badge status-badge--${invoice.status === 'PAID' ? 'available' : 'pending'}`}>
      {invoice.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
    </span>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const defaultRange = getDefaultDateRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<HistoryRow | null>(null);

  const query = { from: from || undefined, to: to || undefined };

  const { data: sessions } = useQuery({
    queryKey: ['history-sessions', query],
    queryFn: () => getSessionHistory(query),
    enabled: !dateError,
  });

  const { data: invoices } = useQuery({
    queryKey: ['history-invoices', query],
    queryFn: () => getInvoiceHistory(query),
    enabled: !dateError,
  });

  function handleDateChange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && nextFrom > nextTo) {
      setDateError('Ngày bắt đầu phải trước ngày kết thúc');
    } else {
      setDateError(null);
    }
  }

  const invoiceBySessionId = new Map((invoices ?? []).map((inv) => [inv.tableSessionId, inv]));
  const rows: HistoryRow[] = (sessions ?? [])
    .map((session) => ({ session, invoice: invoiceBySessionId.get(session.id) }))
    .sort((a, b) => new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime());

  return (
    <div className="history-page">
      <header>
        <button onClick={() => navigate('/dashboard')}>←</button>
        <h1>Lịch sử</h1>
      </header>

      <div className="date-filter">
        <label>
          Từ ngày
          <input type="date" value={from} onChange={(e) => handleDateChange(e.target.value, to)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={(e) => handleDateChange(from, e.target.value)} />
        </label>
      </div>
      {dateError && <p className="error-text">{dateError}</p>}

      {/* Desktop: bảng. Ẩn trên mobile qua CSS. */}
      <table className="history-table">
        <thead>
          <tr>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Tổng tiền</th>
            <th>Thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.session.id} onClick={() => setSelectedRow(row)}>
              <td>{new Date(row.session.startTime).toLocaleString('vi-VN')}</td>
              <td>{row.session.endTime ? new Date(row.session.endTime).toLocaleString('vi-VN') : '-'}</td>
              <td>{row.invoice ? `${Number(row.invoice.totalAmount).toLocaleString('vi-VN')}đ` : '-'}</td>
              <td>
                <PaymentStatusBadge invoice={row.invoice} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4}>Không có dữ liệu trong khoảng ngày đã chọn.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mobile: danh sách card. Ẩn trên desktop qua CSS. */}
      <div className="history-list">
        {rows.map((row) => (
          <div
            key={row.session.id}
            className="history-card"
            onClick={() => setSelectedRow(row)}
          >
            <div className="history-card__header">
              <span>{new Date(row.session.startTime).toLocaleDateString('vi-VN')}</span>
              <PaymentStatusBadge invoice={row.invoice} />
            </div>
            <div className="history-card__time">
              {new Date(row.session.startTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' → '}
              {row.session.endTime
                ? new Date(row.session.endTime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </div>
            <div className="history-card__amount">
              {row.invoice ? `${Number(row.invoice.totalAmount).toLocaleString('vi-VN')}đ` : '-'}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="table-manage-empty">Không có dữ liệu trong khoảng ngày đã chọn.</p>}
      </div>

      {selectedRow && (
        <HistoryDetailModal
          session={selectedRow.session}
          invoice={selectedRow.invoice}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}
