import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Wifi,
  WifiOff,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Trash2,
  Plus,
  Minus,
  X,
  
  Package,
  Tag,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  image_url?: string;
  barcode?: string;
  tax_rate?: number;
}

interface CartItem extends Product {
  quantity: number;
}

const API_BASE = '/api/pos/tablet';

const getToken = () => localStorage.getItem('authToken') || '';
let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };
const apiFetch = async (path: string, options?: RequestInit) => {
  const method = (options?.method || 'GET').toUpperCase();
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...((options?.headers as any) || {}) };
  if (!['GET','HEAD','OPTIONS'].includes(method)) { const c = await getCsrf(); if (c) hdrs['x-csrf-token'] = c; }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: hdrs, credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const CATEGORIES = ['All', 'Beverages', 'Food', 'Electronics', 'Clothing', 'Groceries', 'Health', 'Other'];

export const TabletPOS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (searchTerm) params.set('search', searchTerm);
      const data = await apiFetch(`/catalog?${params}`);
      setProducts(data.products || []);
    } catch {
      // Try offline cache
      const cached = localStorage.getItem('pos_catalog');
      if (cached) setProducts(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Cache products for offline
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('pos_catalog', JSON.stringify(products));
    }
  }, [products]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => (item._id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuickSale = async () => {
    const items = cart.map(item => ({
      product_id: item._id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
    }));
    const amount = parseFloat(paymentAmount) || cartTotal;

    try {
      const result = await apiFetch('/quick-sale', {
        method: 'POST',
        body: JSON.stringify({ items, payment_method: paymentMethod, payment_amount: amount }),
      });
      setLastTransaction(result.transaction);
      setSaleComplete(true);
      setCart([]);
      setShowPayment(false);
      setTimeout(() => setSaleComplete(false), 3000);
    } catch {
      // Store offline
      const offlineTxns = JSON.parse(localStorage.getItem('pos_offline_txns') || '[]');
      offlineTxns.push({
        local_id: `offline_${Date.now()}`,
        items,
        payment_method: paymentMethod,
        payment_amount: amount,
        total: cartTotal,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('pos_offline_txns', JSON.stringify(offlineTxns));
      setSaleComplete(true);
      setCart([]);
      setShowPayment(false);
      setTimeout(() => setSaleComplete(false), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Category Sidebar */}
      <div style={{ width: 180, background: '#111', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
        <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={18} color="#00C971" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#00C971' }}>Categories</span>
        </div>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: selectedCategory === cat ? '#00C971' : 'transparent',
              color: selectedCategory === cat ? '#000' : '#ccc',
              fontWeight: selectedCategory === cat ? 700 : 400,
              fontSize: 15, transition: 'all 0.15s',
            }}
          >
            <ChevronRight size={14} />
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: '#111', borderBottom: '1px solid #222' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: '#1a1a1a', borderRadius: 8, padding: '10px 14px' }}>
            <Search size={18} color="#939393" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 16, outline: 'none' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={16} color="#939393" />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: online ? '#0a2a18' : '#2a1a0a' }}>
            {online ? <Wifi size={16} color="#00C971" /> : <WifiOff size={16} color="#f59e0b" />}
            <span style={{ fontSize: 13, color: online ? '#00C971' : '#f59e0b', fontWeight: 600 }}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Products */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div style={{ color: '#939393' }}>Loading catalog...</div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <Package size={48} color="#333" />
              <span style={{ color: '#939393' }}>No products found</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {products.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: 16, background: '#141414', border: '1px solid #222',
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                    minHeight: 140,
                  }}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, background: '#222', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={24} color="#555" />
                    </div>
                  )}
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, textAlign: 'center', lineHeight: 1.3 }}>{product.name}</span>
                  <span style={{ color: '#00C971', fontWeight: 700, fontSize: 16, marginTop: 6 }}>
                    {'\u20B9'}{product.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div style={{ width: 340, background: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={20} color="#00C971" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Cart</span>
            {cartCount > 0 && (
              <span style={{ background: '#00C971', color: '#000', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{cartCount}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={16} color="#ef4444" />
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555' }}>
              <ShoppingCart size={40} />
              <span style={{ marginTop: 8, fontSize: 14 }}>Cart is empty</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#00C971', fontWeight: 600 }}>{'\u20B9'}{(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => updateQuantity(item._id, -1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={14} color="#fff" />
                  </button>
                  <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={14} color="#fff" />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={14} color="#ef4444" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total & Payment */}
        <div style={{ borderTop: '1px solid #222', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#00C971' }}>{'\u20B9'}{cartTotal.toFixed(2)}</span>
          </div>

          {!showPayment ? (
            <button
              onClick={() => cart.length > 0 && setShowPayment(true)}
              disabled={cart.length === 0}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
                background: cart.length > 0 ? '#00C971' : '#333',
                color: cart.length > 0 ? '#000' : '#666',
                fontWeight: 700, fontSize: 17, cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Charge {'\u20B9'}{cartTotal.toFixed(2)}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
                  { key: 'card', label: 'Card', icon: <CreditCard size={18} /> },
                  { key: 'upi', label: 'UPI', icon: <Smartphone size={18} /> },
                  { key: 'split', label: 'Split', icon: <Split size={18} /> },
                ].map(pm => (
                  <button
                    key={pm.key}
                    onClick={() => setPaymentMethod(pm.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px 8px', borderRadius: 10,
                      border: paymentMethod === pm.key ? '2px solid #00C971' : '1px solid #333',
                      background: paymentMethod === pm.key ? '#0a2a18' : '#1a1a1a',
                      color: paymentMethod === pm.key ? '#00C971' : '#ccc',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    {pm.icon} {pm.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <input
                  type="number"
                  placeholder="Amount received"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 8,
                    border: '1px solid #333', background: '#1a1a1a', color: '#fff',
                    fontSize: 16, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowPayment(false); setPaymentAmount(''); }}
                  style={{ flex: 1, padding: '14px 0', borderRadius: 10, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSale}
                  style={{ flex: 2, padding: '14px 0', borderRadius: 10, border: 'none', background: '#00C971', color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                >
                  Complete Sale
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Complete Overlay */}
      {saleComplete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{ background: '#141414', borderRadius: 20, padding: '40px 48px', textAlign: 'center', border: '1px solid #222' }}>
            <CheckCircle size={64} color="#00C971" />
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 16, color: '#fff' }}>Sale Complete!</div>
            {lastTransaction && (
              <div style={{ fontSize: 28, fontWeight: 700, color: '#00C971', marginTop: 8 }}>
                {'\u20B9'}{lastTransaction.total?.toFixed(2)}
              </div>
            )}
            {lastTransaction?.change > 0 && (
              <div style={{ fontSize: 16, color: '#939393', marginTop: 4 }}>
                Change: {'\u20B9'}{lastTransaction.change.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletPOS;
