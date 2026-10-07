import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodItemManagePage } from './FoodItemManagePage';
import { DrinkItemManagePage } from '../drink-item/DrinkItemManagePage';
import { DrinkIcon, FoodIcon } from '../../core/components/icons';

export function CatalogPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'FOOD' | 'DRINK'>('FOOD');

  return (
    <div className="catalog-page">
      <header>
        <button onClick={() => navigate('/dashboard')}>←</button>
        <h1>Danh mục</h1>
      </header>

      <div className="tabs tabs--block">
        <button className={tab === 'FOOD' ? 'active' : ''} onClick={() => setTab('FOOD')}>
          <FoodIcon size={16} /> Đồ ăn
        </button>
        <button className={tab === 'DRINK' ? 'active' : ''} onClick={() => setTab('DRINK')}>
          <DrinkIcon size={16} /> Nước uống
        </button>
      </div>

      {tab === 'FOOD' ? <FoodItemManagePage /> : <DrinkItemManagePage />}
    </div>
  );
}
