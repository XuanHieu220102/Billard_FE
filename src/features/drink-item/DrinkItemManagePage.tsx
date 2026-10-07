import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStockEntry,
  createDrinkItem,
  deactivateDrinkItem,
  getDrinkItems,
  updateDrinkItem,
} from './drinkItemApi';
import { Modal } from '../../core/components/Modal';
import { useToast } from '../../core/components/ToastProvider';
import { DrinkIcon } from '../../core/components/icons';
import type { DrinkItem } from '../../core/api/types';

export function DrinkItemManagePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: items } = useQuery({ queryKey: ['drink-items'], queryFn: getDrinkItems });

  const [editing, setEditing] = useState<DrinkItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [stockTarget, setStockTarget] = useState<DrinkItem | null>(null);
  const [stockQuantity, setStockQuantity] = useState('');

  function resetForm() {
    setEditing(null);
    setName('');
    setPrice('');
    setError(null);
  }

  function startEdit(item: DrinkItem) {
    setEditing(item);
    setName(item.name);
    setPrice(item.price);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Vui lòng nhập tên món');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Giá phải lớn hơn 0');
      return;
    }
    const isEditing = !!editing;
    try {
      if (editing) {
        await updateDrinkItem(editing.id, { name, price });
      } else {
        await createDrinkItem({ name, price });
      }
      queryClient.invalidateQueries({ queryKey: ['drink-items'] });
      toast.success(isEditing ? `Đã lưu món "${name}"` : `Đã thêm món "${name}"`);
      resetForm();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Có lỗi xảy ra';
      setError(message);
      toast.error(message);
    }
  }

  async function handleDeactivate(item: DrinkItem) {
    if (!confirm(`Ngừng bán "${item.name}"?`)) return;
    try {
      await deactivateDrinkItem(item.id);
      queryClient.invalidateQueries({ queryKey: ['drink-items'] });
      toast.success(`Đã ngừng bán "${item.name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể ngừng bán món này');
    }
  }

  async function handleStockSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    const qty = Number(stockQuantity);
    if (!qty || qty <= 0) {
      toast.error('Số lượng nhập phải lớn hơn 0');
      return;
    }
    try {
      await addStockEntry(stockTarget.id, qty);
      queryClient.invalidateQueries({ queryKey: ['drink-items'] });
      toast.success(`Đã nhập ${qty} "${stockTarget.name}" vào kho`);
      setStockTarget(null);
      setStockQuantity('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể nhập kho, vui lòng thử lại');
    }
  }

  return (
    <div className="catalog-section">
      <form onSubmit={handleSubmit} className="item-form">
        <h3>{editing ? `Sửa "${editing.name}"` : 'Thêm món Nước uống'}</h3>
        <label>
          Tên món
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Giá (đ)
          <input
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="table-form__actions">
          <button type="submit" className="btn-primary">
            {editing ? 'Lưu' : 'Thêm'}
          </button>
          {editing && (
            <button type="button" onClick={resetForm}>
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="catalog-item-list">
        {items?.map((item) => (
          <div key={item.id} className={`catalog-item-card${!item.isActive ? ' catalog-item-card--inactive' : ''}`}>
            <div className="catalog-item-card__icon">
              <DrinkIcon size={20} />
            </div>
            <div className="catalog-item-card__info">
              <span className="catalog-item-card__name">
                {item.name}
                {!item.isActive && <span className="catalog-item-card__badge">Đã ngừng bán</span>}
              </span>
              <span className="catalog-item-card__price">
                {Number(item.price).toLocaleString('vi-VN')}đ · Tồn kho:{' '}
                <strong className={item.stockQuantity <= 0 ? 'catalog-item-card__stock--empty' : ''}>
                  {item.stockQuantity}
                </strong>
              </span>
            </div>
            <div className="catalog-item-card__actions">
              <button onClick={() => setStockTarget(item)}>Nhập kho</button>
              <button onClick={() => startEdit(item)}>Sửa</button>
              <button onClick={() => handleDeactivate(item)} disabled={!item.isActive}>
                Ngừng bán
              </button>
            </div>
          </div>
        ))}
        {items && items.length === 0 && <p className="table-manage-empty">Chưa có món nào.</p>}
      </div>

      {stockTarget && (
        <Modal
          title={`Nhập kho: ${stockTarget.name}`}
          subtitle={`Tồn kho hiện tại: ${stockTarget.stockQuantity}`}
          icon={<DrinkIcon size={20} />}
          onClose={() => setStockTarget(null)}
        >
          <form onSubmit={handleStockSubmit} className="stock-entry-form">
            <label>
              Số lượng thêm
              <input
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                required
                autoFocus
              />
            </label>
            <div className="modal-panel__footer">
              <button type="button" onClick={() => setStockTarget(null)}>
                Hủy
              </button>
              <button type="submit" className="btn-primary">
                Xác nhận nhập kho
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
