import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../core/components/Modal';
import { ReceiptIcon } from '../../core/components/icons';
import { getSessionOrders } from '../table-session/tableSessionApi';
import type { Invoice, TableSession } from '../../core/api/types';

interface HistoryDetailModalProps {
  session: TableSession;
  invoice: Invoice | undefined;
  onClose: () => void;
}

function formatDuration(startTime: string, endTime: string | null): string {
  if (!endTime) return '-';
  const totalSeconds = Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function HistoryDetailModal({ session, invoice, onClose }: HistoryDetailModalProps) {
  const { data: orders } = useQuery({
    queryKey: ['session-orders', session.id],
    queryFn: () => getSessionOrders(session.id),
  });

  return (
    <Modal
      title="Chi tiết phiên chơi"
      subtitle={new Date(session.startTime).toLocaleString('vi-VN')}
      icon={<ReceiptIcon size={20} />}
      onClose={onClose}
    >
      <div className="payment-summary">
        <div className="payment-summary__row">
          <span>Giờ vào</span>
          <span>{new Date(session.startTime).toLocaleTimeString('vi-VN')}</span>
        </div>
        <div className="payment-summary__row">
          <span>Giờ ra</span>
          <span>{session.endTime ? new Date(session.endTime).toLocaleTimeString('vi-VN') : '-'}</span>
        </div>
        <div className="payment-summary__row">
          <span>Tổng thời gian chơi</span>
          <strong className="payment-summary__duration">
            {formatDuration(session.startTime, session.endTime)}
          </strong>
        </div>
        <div className="payment-summary__row">
          <span>Giá/giờ</span>
          <span>{Number(session.pricePerHourSnapshot).toLocaleString('vi-VN')}đ</span>
        </div>
        {invoice && (
          <>
            <div className="payment-summary__row">
              <span>Tiền giờ chơi</span>
              <span>{Number(invoice.tableAmount).toLocaleString('vi-VN')}đ</span>
            </div>
            {invoice.discountPercent > 0 && (
              <div className="payment-summary__row">
                <span>Giảm giá ({invoice.discountPercent}%)</span>
                <span>
                  -
                  {(Number(invoice.tableAmount) - Number(invoice.tableAmountAfterDiscount)).toLocaleString(
                    'vi-VN'
                  )}
                  đ
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {orders && orders.length > 0 && (
        <div className="payment-services">
          <h3>Chi tiết dịch vụ / đồ ăn</h3>
          {orders.map((order) => (
            <div className="payment-summary__row" key={order.id}>
              <span>
                {order.itemName} × {order.quantity}
              </span>
              <span>{Number(order.lineTotal).toLocaleString('vi-VN')}đ</span>
            </div>
          ))}
        </div>
      )}

      {invoice ? (
        <div className="payment-total">
          <span>TỔNG TIỀN:</span>
          <strong>{Number(invoice.totalAmount).toLocaleString('vi-VN')}đ</strong>
        </div>
      ) : (
        <p className="table-manage-empty">Phiên này chưa có hóa đơn (đang chơi hoặc chưa đóng bàn).</p>
      )}

      <div className="modal-panel__footer">
        <button onClick={onClose}>Đóng</button>
      </div>
    </Modal>
  );
}
