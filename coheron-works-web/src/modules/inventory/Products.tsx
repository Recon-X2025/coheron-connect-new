import { useState, useEffect } from 'react';
import { Search, Package, Plus, Warehouse, MapPin, AlertTriangle, Eye, Edit } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { productService } from '../../services/odooService';
import { inventoryService, type StockSummary, type StockQuant } from '../../services/inventoryService';
import { apiService } from '../../services/apiService';
import type { Product } from '../../types/odoo';
import './Products.css';

export const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [stockSummary, setStockSummary] = useState<Record<number, StockSummary>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showStockDetails, setShowStockDetails] = useState(false);
    const [stockDetails, setStockDetails] = useState<StockQuant[]>([]);
    const [loadingStockDetails, setLoadingStockDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [productsData, stockData] = await Promise.all([
                productService.getAll(),
                inventoryService.getStockSummary()
            ]);
            setProducts(productsData);
            
            // Create a map of product_id -> stock summary
            const stockMap: Record<number, StockSummary> = {};
            stockData.forEach(item => {
                stockMap[item.product_id] = item;
            });
            setStockSummary(stockMap);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStockDetails = async (productId: number) => {
        try {
            setLoadingStockDetails(true);
            const details = await inventoryService.getStockQuant({ product_id: productId });
            setStockDetails(details);
        } catch (error) {
            console.error('Failed to load stock details:', error);
        } finally {
            setLoadingStockDetails(false);
        }
    };

    const handleViewStock = async (product: Product) => {
        setSelectedProduct(product);
        setShowStockDetails(true);
        await loadStockDetails(product.id);
    };

    const getStockInfo = (productId: number) => {
        return stockSummary[productId] || {
            total_qty: 0,
            total_reserved: 0,
            available_qty: 0,
            location_count: 0
        };
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.default_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="products-page"><div className="container"><LoadingSpinner /></div></div>;
    }

    return (
        <div className="products-page">
            <div className="container">
                <div className="products-header">
                    <div>
                        <h1>Products</h1>
                        <p className="products-subtitle">{filteredProducts.length} products</p>
                    </div>
                    <Button icon={<Plus size={20} />}>New Product</Button>
                </div>

                <div className="products-toolbar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="products-grid">
                    {filteredProducts.map(product => {
                        const stock = getStockInfo(product.id);
                        const isLowStock = stock.available_qty < (product as any).reorder_point || 0;
                        return (
                            <div key={product.id} className="product-card">
                                <div className="product-card-header">
                                    <div className="product-icon">
                                        <Package size={32} />
                                    </div>
                                    <div className="product-info">
                                        <h3>{product.name}</h3>
                                        <span className="product-code">{product.default_code}</span>
                                    </div>
                                    {isLowStock && (
                                        <div className="low-stock-badge" title="Low Stock">
                                            <AlertTriangle size={18} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="product-pricing">
                                    <div className="price-item">
                                        <span className="label">Sale Price</span>
                                        <span className="value">₹{product.list_price}</span>
                                    </div>
                                    <div className="price-item">
                                        <span className="label">Cost</span>
                                        <span className="value">₹{product.standard_price}</span>
                                    </div>
                                </div>

                                <div className="product-stock-section">
                                    <div className="stock-row">
                                        <span className="label">Total Stock</span>
                                        <span className={`stock-value ${stock.total_qty > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                            {stock.total_qty.toFixed(2)} units
                                        </span>
                                    </div>
                                    <div className="stock-row">
                                        <span className="label">Available</span>
                                        <span className={`stock-value ${stock.available_qty > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                            {stock.available_qty.toFixed(2)} units
                                        </span>
                                    </div>
                                    {stock.total_reserved > 0 && (
                                        <div className="stock-row">
                                            <span className="label">Reserved</span>
                                            <span className="stock-value reserved">
                                                {stock.total_reserved.toFixed(2)} units
                                            </span>
                                        </div>
                                    )}
                                    {stock.location_count > 0 && (
                                        <div className="stock-row">
                                            <span className="label">Locations</span>
                                            <span className="stock-value">
                                                <MapPin size={14} /> {stock.location_count}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="product-actions">
                                    <Button 
                                        variant="secondary" 
                                        size="small"
                                        icon={<Eye size={16} />}
                                        onClick={() => handleViewStock(product)}
                                    >
                                        View Stock
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {showStockDetails && selectedProduct && (
                    <div className="modal-overlay" onClick={() => {
                        setShowStockDetails(false);
                        setSelectedProduct(null);
                    }}>
                        <div className="modal-content stock-details-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Stock Details - {selectedProduct.name}</h2>
                                <button className="close-button" onClick={() => {
                                    setShowStockDetails(false);
                                    setSelectedProduct(null);
                                }}>×</button>
                            </div>
                            
                            {loadingStockDetails ? (
                                <LoadingSpinner />
                            ) : (
                                <div className="stock-details-content">
                                    {stockDetails.length === 0 ? (
                                        <p className="no-stock">No stock found for this product</p>
                                    ) : (
                                        <table className="stock-details-table">
                                            <thead>
                                                <tr>
                                                    <th>Warehouse</th>
                                                    <th>Location</th>
                                                    <th>Quantity</th>
                                                    <th>Reserved</th>
                                                    <th>Available</th>
                                                    <th>Lot/Batch</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockDetails.map((stock) => (
                                                    <tr key={stock.id}>
                                                        <td>{stock.warehouse_name || 'N/A'}</td>
                                                        <td>{stock.location_name}</td>
                                                        <td>{stock.quantity.toFixed(2)}</td>
                                                        <td>{stock.reserved_quantity.toFixed(2)}</td>
                                                        <td>{(stock.quantity - stock.reserved_quantity).toFixed(2)}</td>
                                                        <td>{stock.lot_name || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
