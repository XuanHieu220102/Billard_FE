import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodItemManagePage } from './FoodItemManagePage';
import { DrinkItemManagePage } from '../drink-item/DrinkItemManagePage';
import { DrinkIcon, FoodIcon, ServiceIcon } from '../../core/components/icons';

type CatalogTab = 'FOOD' | 'DRINK' | 'SERVICE';

export function CatalogPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<CatalogTab>('FOOD');

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
        <button className={tab === 'SERVICE' ? 'active' : ''} onClick={() => setTab('SERVICE')}>
          <ServiceIcon size={16} /> Dịch vụ
        </button>
      </div>

      {tab === 'FOOD' && (
        <FoodItemManagePage category="FOOD" icon={<FoodIcon size={20} />} addLabel="Thêm món Đồ ăn" />
      )}
      {tab === 'DRINK' && <DrinkItemManagePage />}
      {tab === 'SERVICE' && (
        <FoodItemManagePage category="SERVICE" icon={<ServiceIcon size={20} />} addLabel="Thêm Dịch vụ" />
      )}
    </div>
  );
}
