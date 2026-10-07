// DTO/type chung, khớp với response envelope và các entity của backend
// (xem billiard_app_technology_and_code_rules.md mục 13, 4, 4.1, 4.2, 4.3)

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  code?: string;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export interface Table {
  id: string;
  tableNumber: string;
  tableType: string | null;
  pricePerHour: string; // BigDecimal serialize dạng string để giữ độ chính xác
  status: TableStatus;
  activeSessionId: string | null; // id của table_session đang ACTIVE, null nếu không OCCUPIED
  activeSessionStartTime: string | null; // startTime của session đang ACTIVE, để hiển thị đồng hồ đếm giờ trên Dashboard
  createdAt: string;
  updatedAt: string;
}

export type TableSessionStatus = 'ACTIVE' | 'CLOSED';

export interface TableSession {
  id: string;
  tableId: string;
  startTime: string;
  endTime: string | null;
  status: TableSessionStatus;
  pricePerHourSnapshot: string;
}

export type ItemType = 'FOOD' | 'DRINK';

export interface FoodItem {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface DrinkItem {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  isActive: boolean;
}

export interface SessionOrder {
  id: string;
  tableSessionId: string;
  itemType: ItemType;
  itemId: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export type InvoiceStatus = 'UNPAID' | 'PAID';

export interface Invoice {
  id: string;
  tableSessionId: string;
  tableAmount: string;
  discountPercent: number;
  tableAmountAfterDiscount: string;
  foodDrinkAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  shopId: string;
  shopName: string;
}

export type ReportPeriod = 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH';

export interface HourlySessionCount {
  hourOfDay: number;
  sessionCount: number;
}

export interface TopFoodDrinkItem {
  itemName: string;
  totalQuantity: number;
  totalRevenue: string;
  revenueSharePercent: string;
}

export interface ReportSummary {
  totalRevenue: string;
  tableRevenue: string;
  foodDrinkRevenue: string;
  totalSessions: number;
  sessionsStartedCount: number;
  sessionsByHour: HourlySessionCount[];
  topFoodDrinkItems: TopFoodDrinkItem[];
}
