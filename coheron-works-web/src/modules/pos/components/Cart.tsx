import React from 'react';
import { ShoppingCart, User, Plus, Minus, Trash2, CreditCard } from 'lucide-react';
import './Cart.css';

interface CartItem {
  product: {
    id: number;
    name: string;
    list_price: number;
  };
  quantity: number;
  price: number;
  discount?: number;
}

interface CartProps {
  cart: CartItem[];
  customer: any | null;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onSelectCustomer: () => void;
  onCheckout: () => void;
  total: number;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  customer,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSelectCustomer,
  onCheckout,
  total,
}) => {
  const getItemTotal = (item: CartItem) => {
    const itemTotal = item.price * item.quantity;
    const discount = item.discount ? (itemTotal * item.discount) / 100 : 0;
    return itemTotal - discount;
  };

  return (
    <div className="pos-cart">
      <div className="cart-header">
        <h2>
          <ShoppingCart size={24} />
          Cart
        </h2>
        {cart.length > 0 && (
          <button className="clear-cart-btn" onClick={onClearCart}>
            Clear
          </button>
        )}
      </div>

      <div className="customer-section">
        <button className="customer-select-btn" onClick={onSelectCustomer}>
          <User size={18} />
          {customer ? customer.name : 'Select Customer'}
        </button>
      </div>

      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="empty-cart">
            <ShoppingCart size={48} />
            <p>Cart is empty</p>
            <span>Add products to get started</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={item.product.id || (item.product as any)._id || idx} className="cart-item">
              <div className="cart-item-info">
                <h4>{item.product.name}</h4>
                <div className="cart-item-price">
                  ₹{item.price.toLocaleString()} × {item.quantity} = ₹
                  {getItemTotal(item).toLocaleString()}
                </div>
              </div>
              <div className="cart-item-actions">
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Minus size={16} />
                </button>
                <span className="quantity">{item.quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus size={16} />
                </button>
                <button
                  className="remove-btn"
                  onClick={() => onRemoveItem(item.product.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="cart-footer">
          <div className="cart-total">
            <span className="total-label">Total:</span>
            <span className="total-amount">₹{total.toLocaleString()}</span>
          </div>
          <button className="checkout-btn" onClick={onCheckout}>
            <CreditCard size={20} />
            Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;

