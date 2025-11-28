import { useState, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';
import { odooService } from '../../services/odooService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import { PaymentDialog } from './components/PaymentDialog';
import type { Product, Partner } from '../../types/odoo';
import './POSInterface.css';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  discount?: number;
}

export const POSInterface = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, partnersData] = await Promise.all([
        odooService.search<Product>('product.product', [['sale_ok', '=', true]], [
          'id',
          'name',
          'list_price',
          'qty_available',
          'image',
        ]),
        odooService.search<Partner>('res.partner', [], ['id', 'name', 'email', 'phone']),
      ]);
      setProducts(productsData);
      setPartners(partnersData);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          price: product.list_price,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const itemTotal = item.price * item.quantity;
      const discount = item.discount ? (itemTotal * item.discount) / 100 : 0;
      return total + itemTotal - discount;
    }, 0);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="pos-interface">
        <LoadingSpinner size="large" message="Loading POS..." />
      </div>
    );
  }

  return (
    <div className="pos-interface">
      <div className="pos-header">
        <div className="pos-title">
          <h1>Point of Sale</h1>
        </div>
        <div className="pos-actions">
          {selectedCustomer && (
            <div className="customer-badge">
              <User size={18} />
              <span>{selectedCustomer.name}</span>
              <button onClick={() => setSelectedCustomer(null)}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pos-main">
        <div className="pos-left">
          <div className="product-search">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ProductGrid products={filteredProducts} onProductClick={addToCart} />
        </div>

        <div className="pos-right">
          <Cart
            cart={cart}
            customer={selectedCustomer}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onSelectCustomer={() => {
              // Customer selection dialog would go here
              const firstCustomer = partners[0];
              if (firstCustomer) setSelectedCustomer(firstCustomer);
            }}
            onCheckout={() => setShowPayment(true)}
            total={getCartTotal()}
          />
        </div>
      </div>

      {showPayment && (
        <PaymentDialog
          cart={cart}
          customer={selectedCustomer}
          total={getCartTotal()}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            clearCart();
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
};

export default POSInterface;

