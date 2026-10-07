import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../core/components/Modal';
import { useToast } from '../../core/components/ToastProvider';
import { CashIcon, PrinterIcon, QrIcon, ReceiptIcon } from '../../core/components/icons';
import { closeTable, getSessionOrders } from './tableSessionApi';
import { payInvoice } from '../invoice/invoiceApi';
import { formatDuration, useElapsedSeconds } from '../../core/utils/useElapsedSeconds';
import type { Table } from '../../core/api/types';

interface PaymentModalProps {
  table: Table;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền Mặt', Icon: CashIcon },
  { value: 'BANK_TRANSFER', label: 'Chuyển Khoản QR', Icon: QrIcon },
];

export function PaymentModal({ table, onClose }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const sessionId = table.activeSessionId as string;
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);

  const elapsedSeconds = useElapsedSeconds(table.activeSessionStartTime);
  const { data: orders } = useQuery({
    queryKey: ['session-orders', sessionId],
    queryFn: () => getSessionOrders(sessionId),
  });

  const tableAmount = (elapsedSeconds / 3600) * Number(table.pricePerHour);
  const foodDrinkAmount = (orders ?? []).reduce((sum, o) => sum + Number(o.lineTotal), 0);
  const totalAmount = tableAmount + foodDrinkAmount;

  const completeMutation = useMutation({
    mutationFn: async () => {
      const invoice = await closeTable(sessionId);
      return payInvoice(invoice.id, paymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Thanh toán thành công — ${table.tableNumber}`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Không thể hoàn tất thanh toán, vui lòng thử lại');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return (
    <Modal
      title={`Hóa Đơn Thanh Toán – ${table.tableNumber}`}
      subtitle="Xác nhận chi tiết dịch vụ và kết thúc giờ chơi"
      icon={<ReceiptIcon size={20} />}
      onClose={onClose}
    >
      <div className="payment-summary">
        <div className="payment-summary__row">
          <span>Giờ vào</span>
          <span>
            {table.activeSessionStartTime
              ? new Date(table.activeSessionStartTime).toLocaleTimeString('vi-VN')
              : '-'}
          </span>
        </div>
        <div className="payment-summary__row">
          <span>Tổng thời gian chơi</span>
          <strong className="payment-summary__duration">{formatDuration(elapsedSeconds)}</strong>
        </div>
        <div className="payment-summary__row">
          <span>Tiền giờ ({Number(table.pricePerHour).toLocaleString('vi-VN')}đ/h)</span>
          <span>{Math.round(tableAmount).toLocaleString('vi-VN')}đ</span>
        </div>
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

      <div className="payment-methods">
        <h3>Phương thức thanh toán</h3>
        <div className="payment-methods__options">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.value}
              className={paymentMethod === method.value ? 'active' : ''}
              onClick={() => setPaymentMethod(method.value)}
            >
              <method.Icon size={16} /> {method.label}
            </button>
          ))}
        </div>
      </div>

      <div className="payment-total">
        <span>TỔNG THANH TOÁN:</span>
        <strong>{Math.round(totalAmount).toLocaleString('vi-VN')}đ</strong>
      </div>

      <div className="modal-panel__footer">
        <button onClick={onClose}>Đóng</button>
        <button
          className="btn-primary"
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? (
            'Đang xử lý...'
          ) : (
            <>
              <PrinterIcon size={16} /> In Hóa Đơn & Hoàn Tất
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
