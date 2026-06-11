export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  businessName: string;
  businessType: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  lastScan: string;
  status: 'Crítico' | 'Baixo' | 'Ok';
  synced?: boolean;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  imageUrl?: string;
  itemsDetected: Array<{
    name: string;
    category: string;
    quantity: number;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalCategories: number;
  stockItems: number;
  lowStockAlerts: number;
  scansToday: number;
}
