import React from 'react';
import { Package } from 'lucide-react';
import './ProductGrid.css';

interface ProductGridProps {
  products: any[];
  onProductClick: (product: any) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
  return (
    <div className="product-grid">
      {products.map((product, idx) => (
        <div
          key={product.id || (product as any)._id || idx}
          className="product-card"
          onClick={() => onProductClick(product)}
        >
          {product.image ? (
            <img src={product.image} alt={product.name} className="product-image" />
          ) : (
            <div className="product-image-placeholder">
              <Package size={32} />
            </div>
          )}
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
            <div className="product-details">
              <span className="product-price">₹{product.list_price.toLocaleString()}</span>
              {product.qty_available !== undefined && (
                <span className={`product-stock ${product.qty_available > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.qty_available > 0 ? `Stock: ${product.qty_available}` : 'Out of Stock'}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      {products.length === 0 && (
        <div className="empty-products">
          <Package size={48} />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;

