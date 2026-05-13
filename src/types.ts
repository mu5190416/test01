export interface Bento {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  bentoName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id?: string;
  customerName: string;
  items: OrderItem[];
  totalPrice: number;
  orderDate: string; // YYYY-MM-DD
  createdAt: any; // Firestore Timestamp
}
