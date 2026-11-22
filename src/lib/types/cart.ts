export interface CartItemAddon {
  addonItemId?: string;
  name: string;
  price: number;
}

export interface CartItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // Unique hash or id for this item configuration
  menuItemId: string;
  name: string;
  basePrice: number;
  unitPrice: number; // variant price or base price
  quantity: number;
  isVeg: boolean;
  taxRate: number;
  imageUrl?: string | null;
  variant?: CartItemVariant | null;
  addons: CartItemAddon[];
  cookingRequest?: string;
  lineTotal: number;
}

export interface CartState {
  items: CartItem[];
  customerNote: string;
  tableSessionId?: string | null;
}
