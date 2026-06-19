import { useState } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, CheckCircle, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, FoodItem } from "../types";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export const CartDrawer = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "completed">("idle");
  const [orderId, setOrderId] = useState("");

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const deliveryFee = subtotal > 0 ? 2.50 : 0;
  const discount = discountApplied ? subtotal * 0.15 : 0; // 15% discount
  const tax = subtotal > 0 ? (subtotal - discount) * 0.08 : 0;
  const total = subtotal > 0 ? subtotal + deliveryFee + tax - discount : 0;

  const handleApplyPromo = () => {
    // Recognize promo code given by support or simple generic ones
    if (promoCode.trim().toLowerCase() === "ffixextra5" || promoCode.trim().toLowerCase() === "foodfix15") {
      setDiscountApplied(true);
      setPromoCode("");
    } else {
      alert("Invalid promotional code! Try 'FFIXEXTRA5' to test discounts.");
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);
    
    // Simulate payment authorization & order creation
    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutStep("completed");
      setOrderId("FF-" + Math.floor(100000 + Math.random() * 900000));
      onClearCart();
    }, 2000);
  };

  const closeAndReset = () => {
    setCheckoutStep("idle");
    setDiscountApplied(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={closeAndReset}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Your Order</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} items selected
                  </p>
                </div>
              </div>
              <button
                onClick={closeAndReset}
                className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {checkoutStep === "completed" ? (
                /* Success Feedback Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center h-full space-y-4"
                >
                  <div className="text-green-500 bg-green-50 p-6 rounded-full animate-pulse">
                    <CheckCircle size={64} className="stroke-2" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">Order Confirmed!</h3>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Your pizza/biryani is being freshly prepared and is on its way.
                  </p>
                  <div className="bg-slate-50 px-4 py-3 rounded-2xl w-full border border-dashed border-slate-200">
                    <span className="text-xs uppercase text-slate-400 font-bold tracking-wider block">Order ID</span>
                    <span className="text-lg font-mono font-bold text-slate-700">{orderId}</span>
                  </div>
                  <p className="text-xs text-orange-600 font-medium">
                    Enjoying your food? Keep support chat open if you have comments!
                  </p>
                  <button
                    onClick={closeAndReset}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    Back to Menu
                  </button>
                </motion.div>
              ) : cartItems.length === 0 ? (
                /* Empty Cart Screen */
                <div className="flex flex-col items-center justify-center text-center h-full space-y-4">
                  <div className="text-slate-300">
                    <ShoppingBag size={80} className="stroke-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-lg">Your cart is empty</h3>
                    <p className="text-sm text-slate-400 max-w-xs mt-1">
                      Explore the delicious dishes on our list and click "ADD" to assemble your meal.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                  >
                    View Popular Choices
                  </button>
                </div>
              ) : (
                /* Listed Cart Items */
                <div className="space-y-4">
                  {cartItems.map(({ item, quantity }) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 hover:shadow-sm transition"
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-xl"
                      />
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400 truncate">{item.restaurant}</p>
                        <span className="text-sm font-bold text-slate-900 mt-1 block">
                          ${(item.price * quantity).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-1">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-white text-slate-500 rounded-lg transition"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-2.5 min-w-6 text-center select-none">
                            {quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-white text-slate-500 rounded-lg transition"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Order Pricing Summary Footer */}
            {checkoutStep !== "completed" && cartItems.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4 rounded-b-2xl">
                {/* Promo Applied status */}
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Try FFIXEXTRA5 (15% off)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={discountApplied}
                      className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 placeholder-slate-400 font-medium"
                    />
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    disabled={discountApplied || !promoCode.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                  >
                    {discountApplied ? "Applied" : "Apply"}
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-800 font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                  {discountApplied && (
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>Discount (15%)</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="text-slate-800 font-bold">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (8%)</span>
                    <span className="text-slate-800 font-bold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-900 pt-2 border-t border-dashed border-slate-200 font-bold">
                    <span>Total Amount</span>
                    <span className="text-orange-600 font-extrabold text-base">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-200 transition flex justify-center items-center gap-2 cursor-pointer disabled:bg-orange-300"
                >
                  {isCheckingOut ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying order details...
                    </span>
                  ) : (
                    <>
                      <span>Place Order</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
