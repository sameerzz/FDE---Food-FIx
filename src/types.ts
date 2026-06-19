export interface FoodItem {
  id: string;
  name: string;
  restaurant: string;
  rating: number;
  price: number;
  deliveryTime: string;
  imageUrl: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem {
  item: FoodItem;
  quantity: number;
}

