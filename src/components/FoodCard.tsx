import { FoodItem } from '../types';

interface FoodCardProps {
  item: FoodItem;
  onAddToCart: (item: FoodItem) => void;
  key?: string | number;
}

export const FoodCard = ({ item, onAddToCart }: FoodCardProps) => {
  return (
      <div id={`food-card-${item.id}`} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-orange-200 transition-shadow border border-slate-100 flex flex-col h-full">
      <img referrerPolicy="no-referrer" src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-slate-800">{item.name}</h3>
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">★ {item.rating}</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{item.restaurant}</p>
        <div className="flex justify-between items-center mt-auto pt-2 text-sm">
          <span className="font-bold text-slate-900">${item.price.toFixed(2)}</span>
          <span className="text-slate-400 text-xs font-bold">{item.deliveryTime}</span>
        </div>
        <button 
          onClick={() => onAddToCart(item)}
          className="w-full mt-3 bg-orange-500 text-white py-2.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-sm hover:shadow-md cursor-pointer active:scale-95"
        >
          ADD
        </button>
      </div>
    </div>
  );
};
