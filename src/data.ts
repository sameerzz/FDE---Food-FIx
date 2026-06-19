import { FoodItem, Category } from './types';

export const categories: Category[] = [
  { id: '1', name: 'Pizza', icon: '🍕' },
  { id: '2', name: 'Biryani', icon: '🍛' },
  { id: '3', name: 'Burgers', icon: '🍔' },
  { id: '4', name: 'Chinese', icon: '🍜' },
  { id: '5', name: 'Desserts', icon: '🍰' },
  { id: '6', name: 'Healthy', icon: '🥗' },
];

export const foodItems: FoodItem[] = [
  { id: '1', name: 'Margherita Pizza', restaurant: 'Pizza Palace', rating: 4.5, price: 12.99, deliveryTime: '25-30 min', imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=400', category: 'Pizza' },
  { id: '2', name: 'Chicken Biryani', restaurant: 'Spice Kingdom', rating: 4.8, price: 15.50, deliveryTime: '30-40 min', imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400', category: 'Biryani' },
  { id: '3', name: 'Classic Burger', restaurant: 'Burger Joint', rating: 4.2, price: 9.99, deliveryTime: '15-25 min', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400', category: 'Burgers' },
  { id: '4', name: 'Noodles', restaurant: 'Wok Master', rating: 4.4, price: 11.50, deliveryTime: '20-30 min', imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=400', category: 'Chinese' },
];
