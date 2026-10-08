import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../core/components/Modal';
import { useToast } from '../../core/components/ToastProvider';
import { CartIcon, DrinkIcon, FoodIcon, ServiceIcon } from '../../core/components/icons';
import {
  addSessionOrder,
  deleteSessionOrder,
  getSessionOrders,
  updateSessionOrderQuantity,
} from './tableSessionApi';
import { getFoodItems } from '../food-item/foodItemApi';
import { getDrinkItems } from '../drink-item/drinkItemApi';
import type { DrinkItem, FoodItem, ItemType, SessionOrder } from '../../core/api/types';

interface AddOrderModalProps {
  sessionId: string;
  tableLabel: string;
  onClose: () => void;
}

type CatalogItem = (FoodItem | DrinkItem) & { itemType: ItemType };

export function AddOrderModal({ sessionId, tableLabel, onClose }: AddOrderModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

  const { data: foodItems } = useQuery({ queryKey: ['food-items'], queryFn: () => getFoodItems() });
  const { data: drinkItems } = useQuery({ queryKey: ['drink-items'], queryFn: getDrinkItems });
  const { data: existingOrders } = useQuery({
    queryKey: ['session-orders', sessionId],
    queryFn: () => getSessionOrders(sessionId),
  });

  // Khởi tạo bộ đếm theo đơn đã gọi trước đó trong phiên — modal hoạt động
  // như một giỏ hàng đang mở, không phải form thêm mới trống mỗi lần.
  useEffect(() => {
    if (initialized || !existingOrders) return;
    const initialQuantities: Record<string, number> = {};
    for (const order of existingOrders) {
      initialQuantities[order.itemId] = order.quantity;
    }
    setQuantities(initialQuantities);
    setInitialized(true);
  }, [existingOrders, initialized]);

  const items: CatalogItem[] = [
    ...(foodItems ?? [])
      .filter((i) => i.isActive)
      .map((i) => ({ ...i, itemType: i.category as ItemType })),
    ...(drinkItems ?? [])
      .filter((i) => i.isActive)
      .map((i) => ({ ...i, itemType: 'DRINK' as ItemType })),
  ];

  const orderByItemId = new Map<string, SessionOrder>((existingOrders ?? []).map((o) => [o.itemId, o]));

  function getQuantity(itemId: string) {
    return quantities[itemId] ?? 0;
  }

  function changeQuantity(item: CatalogItem, delta: number) {
    setQuantities((q) => {
      const current = q[item.id] ?? 0;
      // Tồn kho còn lại = tồn kho hiện tại + số đã gọi trước đó của chính món này
      // (vì số đã gọi đã bị trừ kho rồi, cần cộng lại để biết giới hạn thực sự có thể chọn).
      const alreadyOrdered = orderByItemId.get(item.id)?.quantity ?? 0;
      const max =
        item.itemType === 'DRINK' ? (item as DrinkItem).stockQuantity + alreadyOrdered : Infinity;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...q, [item.id]: next };
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + Number(item.price) * getQuantity(item.id), 0);

  const submitMutation = useMutation({
    mutationFn: async () => {
      for (const item of items) {
        const newQty = getQuantity(item.id);
        const existing = orderByItemId.get(item.id);

        if (existing && newQty === 0) {
          await deleteSessionOrder(sessionId, existing.id);
        } else if (existing && newQty !== existing.quantity) {
          await updateSessionOrderQuantity(sessionId, existing.id, newQty);
        } else if (!existing && newQty > 0) {
          await addSessionOrder(sessionId, item.itemType, item.id, newQty);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-orders', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['drink-items'] });
      toast.success(`Đã cập nhật món cho ${tableLabel}`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Không thể cập nhật món (có thể một món đã hết hàng)');
      queryClient.invalidateQueries({ queryKey: ['session-orders', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['drink-items'] });
    },
  });

  return (
    <Modal
      title={`Thêm Dịch Vụ – ${tableLabel}`}
      subtitle="Chọn thức uống, đồ ăn nhẹ cho bàn"
      icon={<CartIcon size={20} />}
      onClose={onClose}
    >
      <div className="order-item-grid">
        {items.map((item) => {
          const qty = getQuantity(item.id);
          const alreadyOrdered = orderByItemId.get(item.id)?.quantity ?? 0;
          const remainingStock =
            item.itemType === 'DRINK' ? (item as DrinkItem).stockQuantity + alreadyOrdered : Infinity;
          const outOfStock = item.itemType === 'DRINK' && remainingStock <= 0;
          return (
            <div key={item.id} className={`order-item-row${outOfStock ? ' order-item-row--disabled' : ''}`}>
              <div className="order-item-row__icon">
                {item.itemType === 'FOOD' && <FoodIcon />}
                {item.itemType === 'DRINK' && <DrinkIcon />}
                {item.itemType === 'SERVICE' && <ServiceIcon />}
              </div>
              <div className="order-item-row__info">
                <span className="order-item-row__name">{item.name}</span>
                <span className="order-item-row__price">
                  {Number(item.price).toLocaleString('vi-VN')}đ
                  {outOfStock ? ' — Hết hàng' : ''}
                </span>
              </div>
              <div className="order-item-row__counter">
                <button onClick={() => changeQuantity(item, -1)} disabled={qty <= 0}>
                  −
                </button>
                <span>{qty}</span>
                <button onClick={() => changeQuantity(item, 1)} disabled={qty >= remainingStock}>
                  +
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p>Chưa có món nào trong danh mục.</p>}
      </div>

      <div className="modal-panel__footer">
        <div>
          <span className="modal-panel__footer-label">Tổng tiền dịch vụ:</span>
          <strong className="modal-panel__footer-amount">{totalAmount.toLocaleString('vi-VN')}đ</strong>
        </div>
        <div className="modal-panel__footer-actions">
          <button onClick={onClose}>Hủy</button>
          <button
            className="btn-primary"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Đang cập nhật...' : 'Xác Nhận Đặt Món'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
