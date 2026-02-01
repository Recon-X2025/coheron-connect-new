import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Package } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ProductForm } from './ProductForm';
import './ProductCatalog.css';

interface WebsiteProduct {
  id: number;
  product_id: number;
  product_name: string;
  default_code: string;
  list_price: number;
  qty_available: number;
  is_published: boolean;
  is_featured: boolean;
  sync_status: string;
}

export const ProductCatalog = () => {
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/website/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncProduct = async (productId: number) => {
    try {
      const response = await fetch('/api/website/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, site_id: 1 }),
      });
      if (response.ok) {
        loadProducts();
      }
    } catch (error) {
      console.error('Error syncing product:', error);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.default_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading products..." />;
  }

  return (
    <div className="product-catalog">
      <div className="product-catalog-header">
        <h2>Product Catalog</h2>
        <Button icon={<Plus size={18} />} onClick={() => setShowProductForm(true)}>Add Product</Button>
      </div>

      <div className="product-catalog-search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="product-catalog-table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <Package size={48} />
                  <p>No products found</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, idx) => (
                <tr key={product.id || (product as any)._id || idx}>
                  <td>
                    <div className="product-info">
                      <strong>{product.product_name}</strong>
                    </div>
                  </td>
                  <td>{product.default_code}</td>
                  <td>${product.list_price.toFixed(2)}</td>
                  <td>{product.qty_available}</td>
                  <td>
                    <span className={`status-badge ${product.is_published ? 'published' : 'draft'}`}>
                      {product.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <span className={`sync-status ${product.sync_status}`}>
                      {product.sync_status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="sync-btn"
                      onClick={() => syncProduct(product.product_id)}
                      title="Sync from ERP"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {showProductForm && (
          <ProductForm
            onClose={() => setShowProductForm(false)}
            onSave={() => {
              setShowProductForm(false);
              loadProducts();
            }}
          />
        )}
      </div>
    </div>
  );
};

