import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFoodItem, deactivateFoodItem, getFoodItems, updateFoodItem } from './foodItemApi';
import { useToast } from '../../core/components/ToastProvider';
import { FoodIcon } from '../../core/components/icons';
import type { FoodItem } from '../../core/api/types';

export function FoodItemManagePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: items } = useQuery({ queryKey: ['food-items'], queryFn: getFoodItems });

  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditing(null);
    setName('');
    setPrice('');
    setError(null);
  }

  function startEdit(item: FoodItem) {
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
        await updateFoodItem(editing.id, { name, price });
      } else {
        await createFoodItem({ name, price });
      }
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
      toast.success(isEditing ? `Đã lưu món "${name}"` : `Đã thêm món "${name}"`);
      resetForm();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Có lỗi xảy ra';
      setError(message);
      toast.error(message);
    }
  }

  async function handleDeactivate(item: FoodItem) {
    if (!confirm(`Ngừng bán "${item.name}"?`)) return;
    try {
      await deactivateFoodItem(item.id);
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
      toast.success(`Đã ngừng bán "${item.name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể ngừng bán món này');
    }
  }

  return (
    <div className="catalog-section">
      <form onSubmit={handleSubmit} className="item-form">
        <h3>{editing ? `Sửa "${editing.name}"` : 'Thêm món Đồ ăn'}</h3>
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
              <FoodIcon size={20} />
            </div>
            <div className="catalog-item-card__info">
              <span className="catalog-item-card__name">
                {item.name}
                {!item.isActive && <span className="catalog-item-card__badge">Đã ngừng bán</span>}
              </span>
              <span className="catalog-item-card__price">
                {Number(item.price).toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="catalog-item-card__actions">
              <button onClick={() => startEdit(item)}>Sửa</button>
              <button onClick={() => handleDeactivate(item)} disabled={!item.isActive}>
                Ngừng bán
              </button>
            </div>
          </div>
        ))}
        {items && items.length === 0 && <p className="table-manage-empty">Chưa có món nào.</p>}
      </div>
    </div>
  );
}
