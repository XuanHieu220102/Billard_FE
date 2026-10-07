import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTables } from '../table/tableApi';
import { getSessionOrders, openTable } from '../table-session/tableSessionApi';
import { AddOrderModal } from '../table-session/AddOrderModal';
import { PaymentModal } from '../table-session/PaymentModal';
import { getReportSummary } from '../report/reportApi';
import { useAuthStore } from '../auth/authStore';
import { useToast } from '../../core/components/ToastProvider';
import { formatDuration, useElapsedSeconds } from '../../core/utils/useElapsedSeconds';
import {
  BilliardBallIcon,
  CashIcon,
  ChartIcon,
  CheckIcon,
  ClockIcon,
  CupIcon,
  DrinkIcon,
  GridIcon,
  HistoryIcon,
  LogoutIcon,
  MenuBookIcon,
  PlayIcon,
} from '../../core/components/icons';
import type { Table, TableStatus } from '../../core/api/types';

type TableFilter = 'ALL' | 'OCCUPIED' | 'AVAILABLE';

interface TableCardProps {
  table: Table;
  onOpenTable: (table: Table) => void;
  onAddOrder: (table: Table) => void;
  onPay: (table: Table) => void;
  isOpening: boolean;
}

function TableCard({ table, onOpenTable, onAddOrder, onPay, isOpening }: TableCardProps) {
  const isOccupied = table.status === 'OCCUPIED' && !!table.activeSessionStartTime;

  const elapsedSeconds = useElapsedSeconds(table.activeSessionStartTime);

  // Cùng query key mà các modal Gọi Món/Thanh Toán dùng — khi một modal thêm/sửa/xóa order
  // và invalidate key này, Dashboard tự refetch theo, không cần polling.
  const { data: orders } = useQuery({
    queryKey: ['session-orders', table.activeSessionId],
    queryFn: () => getSessionOrders(table.activeSessionId as string),
    enabled: isOccupied && !!table.activeSessionId,
  });

  const statusLabel: Record<Table['status'], string> = {
    AVAILABLE: 'Còn trống',
    OCCUPIED: 'Đang chơi',
    MAINTENANCE: 'Ngừng sử dụng',
  };

  const tableAmount = isOccupied ? (elapsedSeconds / 3600) * Number(table.pricePerHour) : 0;
  const foodDrinkAmount = (orders ?? []).reduce((sum, o) => sum + Number(o.lineTotal), 0);
  const runningTotal = tableAmount + foodDrinkAmount;

  return (
    <div className={`table-card table-card--${table.status.toLowerCase()}`}>
      <div className="table-card__header">
        <h3>{table.tableNumber}</h3>
        <span className="table-card__status">{statusLabel[table.status]}</span>
      </div>
      <p className="table-card__price">{Number(table.pricePerHour).toLocaleString('vi-VN')}đ/giờ</p>

      {isOccupied && (
        <>
          <div className="table-card__info-box">
            <div className="table-card__info-row">
              <span className="table-card__info-label">
                <ClockIcon size={14} /> Thời gian:
              </span>
              <strong className="elapsed-time">{formatDuration(elapsedSeconds)}</strong>
            </div>
            <div className="table-card__info-row">
              <span>Bắt đầu:</span>
              <strong>
                {table.activeSessionStartTime
                  ? new Date(table.activeSessionStartTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </strong>
            </div>
            <div className="table-card__info-row">
              <span className="table-card__info-label">
                <DrinkIcon size={14} /> Dịch vụ ({orders?.length ?? 0} món):
              </span>
              <strong>{Math.round(foodDrinkAmount).toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>

          <div className="table-card__footer">
            <p className="table-card__running-total">
              Tạm tính: <strong>{Math.round(runningTotal).toLocaleString('vi-VN')}đ</strong>
            </p>
            <div className="table-card__actions table-card__actions--split">
              <button onClick={() => onAddOrder(table)}>+ Gọi Món</button>
              <button className="btn-primary" onClick={() => onPay(table)}>
                Thanh Toán
              </button>
            </div>
          </div>
        </>
      )}

      {table.status === 'AVAILABLE' && (
        <>
          <div className="table-card__info-box table-card__info-box--empty">
            <CupIcon size={26} />
            <span>Sẵn sàng đón khách</span>
          </div>

          <div className="table-card__footer">
            <p className="table-card__running-total">
              Tạm tính: <strong className="table-card__running-total--empty">···</strong>
            </p>

            <div className="table-card__actions">
              <button
                className="btn-success table-card__start-btn"
                onClick={() => onOpenTable(table)}
                disabled={isOpening}
              >
                {isOpening ? (
                  'Đang mở bàn...'
                ) : (
                  <>
                    <PlayIcon size={14} /> Bắt Đầu Chơi
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const FILTER_OPTIONS: { value: TableFilter; label: string; matchesStatus?: TableStatus }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'OCCUPIED', label: 'Đang chơi', matchesStatus: 'OCCUPIED' },
  { value: 'AVAILABLE', label: 'Bàn trống', matchesStatus: 'AVAILABLE' },
];

export function DashboardPage() {
  const shopName = useAuthStore((s) => s.shopName);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: getTables,
  });

  const { data: todaySummary } = useQuery({
    queryKey: ['report-summary', 'TODAY'],
    queryFn: () => getReportSummary('TODAY'),
  });

  const [orderModalTable, setOrderModalTable] = useState<Table | null>(null);
  const [paymentModalTable, setPaymentModalTable] = useState<Table | null>(null);
  const [filter, setFilter] = useState<TableFilter>('ALL');

  const occupiedCount = (tables ?? []).filter((t) => t.status === 'OCCUPIED').length;
  const availableCount = (tables ?? []).filter((t) => t.status === 'AVAILABLE').length;
  const totalCount = tables?.length ?? 0;

  const filteredTables = (tables ?? []).filter((table) => {
    const option = FILTER_OPTIONS.find((f) => f.value === filter);
    return !option?.matchesStatus || table.status === option.matchesStatus;
  });

  const openMutation = useMutation({
    mutationFn: (table: Table) => openTable(table.id),
    onSuccess: (_session, table) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Đã mở ${table.tableNumber}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Không thể mở bàn này (có thể đã có người mở)');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header__top">
          <div className="dashboard-header__brand">
            <div className="dashboard-header__logo">
              <BilliardBallIcon size={22} />
            </div>
            <div>
              <h1>{shopName ?? 'Quán bi-a'}</h1>
              <span className="dashboard-header__tagline">Quản lý quán bi-a</span>
            </div>
          </div>
          <button className="dashboard-header__logout" onClick={logout}>
            <LogoutIcon size={15} /> <span>Đăng xuất</span>
          </button>
        </div>
        <nav className="dashboard-header__nav">
          <Link to="/tables/manage">
            <GridIcon size={15} /> Quản lý bàn
          </Link>
          <Link to="/catalog">
            <MenuBookIcon size={15} /> Danh mục
          </Link>
          <Link to="/history">
            <HistoryIcon size={15} /> Lịch sử
          </Link>
          <Link to="/report">
            <ChartIcon size={15} /> Báo cáo
          </Link>
        </nav>
      </header>

      {!isLoading && tables && tables.length > 0 && (
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-card__info">
              <span className="dashboard-stat-card__label">Bàn đang chơi</span>
              <strong className="dashboard-stat-card__value">
                {occupiedCount} <span className="dashboard-stat-card__value-total">/ {totalCount}</span>
              </strong>
            </div>
            <div className="dashboard-stat-card__icon dashboard-stat-card__icon--primary">
              <ClockIcon size={18} />
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-card__info">
              <span className="dashboard-stat-card__label">Bàn trống</span>
              <strong className="dashboard-stat-card__value">{availableCount}</strong>
            </div>
            <div className="dashboard-stat-card__icon dashboard-stat-card__icon--success">
              <CheckIcon size={18} />
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-card__info">
              <span className="dashboard-stat-card__label">Doanh thu hôm nay</span>
              <strong className="dashboard-stat-card__value dashboard-stat-card__value--money">
                {todaySummary ? `${Math.round(Number(todaySummary.totalRevenue)).toLocaleString('vi-VN')}đ` : '···'}
              </strong>
            </div>
            <div className="dashboard-stat-card__icon dashboard-stat-card__icon--warning">
              <CashIcon size={18} />
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-card__info">
              <span className="dashboard-stat-card__label">Số lượt chơi</span>
              <strong className="dashboard-stat-card__value">
                {todaySummary ? todaySummary.sessionsStartedCount : '···'}
              </strong>
            </div>
            <div className="dashboard-stat-card__icon dashboard-stat-card__icon--primary">
              <PlayIcon size={16} />
            </div>
          </div>
        </div>
      )}

      {!isLoading && tables && tables.length > 0 && (
        <div className="table-filter">
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === 'ALL'
                ? totalCount
                : opt.value === 'OCCUPIED'
                  ? occupiedCount
                  : availableCount;
            return (
              <button
                key={opt.value}
                className={filter === opt.value ? 'active' : ''}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {isLoading && <p>Đang tải...</p>}

      {!isLoading && (!tables || tables.length === 0) && (
        <div className="empty-state">
          <p>Chưa có bàn nào.</p>
          <Link to="/tables/manage">Tạo bàn mới</Link>
        </div>
      )}

      {!isLoading && tables && tables.length > 0 && filteredTables.length === 0 && (
        <p className="table-manage-empty">Không có bàn nào ở trạng thái này.</p>
      )}

      <div className="table-grid">
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onOpenTable={(t) => openMutation.mutate(t)}
            onAddOrder={setOrderModalTable}
            onPay={setPaymentModalTable}
            isOpening={openMutation.isPending && openMutation.variables?.id === table.id}
          />
        ))}
      </div>

      {orderModalTable && orderModalTable.activeSessionId && (
        <AddOrderModal
          sessionId={orderModalTable.activeSessionId}
          tableLabel={orderModalTable.tableNumber}
          onClose={() => setOrderModalTable(null)}
        />
      )}

      {paymentModalTable && paymentModalTable.activeSessionId && (
        <PaymentModal table={paymentModalTable} onClose={() => setPaymentModalTable(null)} />
      )}
    </div>
  );
}
