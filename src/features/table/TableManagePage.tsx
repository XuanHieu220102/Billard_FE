import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTable,
  deactivateTable,
  DEFAULT_PRICE_PER_HOUR,
  getTables,
  updateTable,
} from './tableApi';
import { useToast } from '../../core/components/ToastProvider';
import type { Table, TableStatus } from '../../core/api/types';

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang chơi',
  MAINTENANCE: 'Ngừng sử dụng',
};

export function TableManagePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: getTables });

  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [tableType, setTableType] = useState('');
  const [pricePerHour, setPricePerHour] = useState(DEFAULT_PRICE_PER_HOUR);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingTable(null);
    setTableNumber('');
    setTableType('');
    setPricePerHour(DEFAULT_PRICE_PER_HOUR);
    setError(null);
  }

  function startEdit(table: Table) {
    setEditingTable(table);
    setTableNumber(table.tableNumber);
    setTableType(table.tableType ?? '');
    setPricePerHour(table.pricePerHour);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const price = Number(pricePerHour);
    if (!tableNumber.trim()) {
      setError('Vui lòng nhập số bàn');
      return;
    }
    if (!price || price <= 0) {
      setError('Giá theo giờ phải lớn hơn 0');
      return;
    }

    const isEditing = !!editingTable;
    try {
      if (editingTable) {
        await updateTable(editingTable.id, { tableNumber, tableType, pricePerHour });
      } else {
        await createTable({ tableNumber, tableType, pricePerHour });
      }
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(isEditing ? `Đã lưu bàn ${tableNumber}` : `Đã tạo bàn ${tableNumber}`);
      resetForm();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại';
      setError(message);
      toast.error(message);
    }
  }

  async function handleDeactivate(table: Table) {
    if (table.status === 'OCCUPIED') return;
    if (!confirm(`Ngừng sử dụng bàn ${table.tableNumber}?`)) return;
    try {
      await deactivateTable(table.id);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Đã ngừng sử dụng bàn ${table.tableNumber}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể ngừng sử dụng bàn này');
    }
  }

  return (
    <div className="table-manage-page">
      <header>
        <Link to="/dashboard">← Dashboard</Link>
        <h1>Quản lý bàn</h1>
      </header>

      <form onSubmit={handleSubmit} className="table-form">
        <h2>{editingTable ? `Sửa bàn ${editingTable.tableNumber}` : 'Tạo bàn mới'}</h2>
        <label>
          Số bàn / tên bàn
          <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required />
        </label>
        <label>
          Loại bàn (tùy chọn)
          <input value={tableType} onChange={(e) => setTableType(e.target.value)} />
        </label>
        <label>
          Giá theo giờ (đ)
          <input
            type="number"
            min="1"
            step="1000"
            value={pricePerHour}
            onChange={(e) => setPricePerHour(e.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="table-form__actions">
          <button type="submit" className="btn-primary">
            {editingTable ? 'Lưu' : 'Tạo bàn'}
          </button>
          {editingTable && (
            <button type="button" onClick={resetForm}>
              Hủy
            </button>
          )}
        </div>
      </form>

      {/* Desktop: bảng. Ẩn trên mobile qua CSS (xem .table-list trong media query). */}
      <table className="table-list">
        <thead>
          <tr>
            <th>Số bàn</th>
            <th>Loại</th>
            <th>Giá/giờ</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tables?.map((table) => (
            <tr key={table.id}>
              <td>{table.tableNumber}</td>
              <td>{table.tableType ?? '-'}</td>
              <td>{Number(table.pricePerHour).toLocaleString('vi-VN')}đ</td>
              <td>
                <span className={`status-badge status-badge--${table.status.toLowerCase()}`}>
                  {STATUS_LABEL[table.status]}
                </span>
              </td>
              <td>
                <button onClick={() => startEdit(table)}>Sửa</button>
                <button
                  onClick={() => handleDeactivate(table)}
                  disabled={table.status === 'OCCUPIED'}
                >
                  Ngừng sử dụng
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: danh sách card. Ẩn trên desktop qua CSS. */}
      <div className="table-manage-list">
        {tables?.map((table) => (
          <div key={table.id} className="table-manage-card">
            <div className="table-manage-card__header">
              <h3>{table.tableNumber}</h3>
              <span className={`status-badge status-badge--${table.status.toLowerCase()}`}>
                {STATUS_LABEL[table.status]}
              </span>
            </div>
            <div className="table-manage-card__info">
              <span>{table.tableType ?? 'Chưa phân loại'}</span>
              <span>{Number(table.pricePerHour).toLocaleString('vi-VN')}đ/giờ</span>
            </div>
            <div className="table-manage-card__actions">
              <button onClick={() => startEdit(table)}>Sửa</button>
              <button
                onClick={() => handleDeactivate(table)}
                disabled={table.status === 'OCCUPIED'}
              >
                Ngừng sử dụng
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables && tables.length === 0 && <p className="table-manage-empty">Chưa có bàn nào.</p>}
    </div>
  );
}
