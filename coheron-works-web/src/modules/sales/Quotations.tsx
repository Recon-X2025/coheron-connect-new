import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Send, CheckCircle, Mail, History, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { saleOrderService, partnerService } from '../../services/odooService';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import type { SaleOrder, Partner } from '../../types/odoo';
import './Quotations.css';

export const Quotations = () => {
  const [quotations, setQuotations] = useState<SaleOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterDomain, setFilterDomain] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SaleOrder | null>(null);
  const [quoteVersions, setQuoteVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterDomain]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Quotations are sales orders in 'draft' or 'sent' state
      const [quotesData, partnersData] = await Promise.all([
        saleOrderService.getAll().then(orders => 
          orders.filter(order => order.state === 'draft' || order.state === 'sent')
        ),
        partnerService.getAll(),
      ]);
      setQuotations(quotesData);
      setPartners(partnersData);
    } finally {
      setLoading(false);
    }
  };

  const getPartnerName = (partnerId: number) => {
    return partners.find((p) => p.id === partnerId)?.name || 'Unknown';
  };

  const handleSendQuotation = async (id: number) => {
    try {
      // Send quotation via email
      await saleOrderService.update(id, {
        state: 'sent',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to send quotation:', error);
    }
  };

  const handleConvertToOrder = async (id: number) => {
    try {
      // Convert quotation to sales order
      await saleOrderService.update(id, {
        state: 'sale',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to convert quotation:', error);
    }
  };

  const handleDelete = async (ids: number[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} quotation(s)?`)) {
      try {
        await saleOrderService.delete(ids[0]);
        await loadData();
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete quotations:', error);
      }
    }
  };

  const handleBulkUpdate = async (ids: number[]) => {
    console.log('Bulk update for:', ids);
  };

  const handleBulkAssign = async (ids: number[]) => {
    console.log('Bulk assign for:', ids);
  };

  const handleViewVersions = async (quoteId: number) => {
    try {
      const versions = await apiService.get<any>(`/sale-orders/${quoteId}/versions`);
      setQuoteVersions(versions);
      setShowVersions(true);
      const quote = quotations.find(q => q.id === quoteId);
      if (quote) setSelectedQuote(quote);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const filteredQuotations = quotations.filter((quote) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.name.toLowerCase().includes(searchLower) ||
      getPartnerName(quote.partner_id).toLowerCase().includes(searchLower)
    );
  });

  const filterFields = [
    { name: 'state', label: 'State', type: 'selection' as const },
    { name: 'amount_total', label: 'Total Amount', type: 'number' as const },
    { name: 'date_order', label: 'Date', type: 'date' as const },
  ];

  if (loading) {
    return (
      <div className="quotations-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading quotations..." />
        </div>
      </div>
    );
  }

  return (
    <div className="quotations-page">
      <div className="container">
        <div className="quotations-header">
          <div>
            <h1>Quotations</h1>
            <p className="quotations-subtitle">
              {filteredQuotations.length} quotation(s) found
            </p>
          </div>
          <Button icon={<Plus size={20} />}>New Quotation</Button>
        </div>

        <div className="quotations-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <AdvancedFilter
            fields={filterFields}
            onFilterChange={setFilterDomain}
            savedFilters={[]}
          />
        </div>

        {selectedIds.length > 0 && (
          <BulkActions
            selectedIds={selectedIds}
            totalCount={filteredQuotations.length}
            onSelectionChange={setSelectedIds}
            actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
          />
        )}

        <div className="quotations-grid">
          {filteredQuotations.map((quote) => (
            <div key={quote.id} className="quotation-card">
              <div className="quotation-header">
                <div>
                  <h3>{quote.name}</h3>
                  <p className="quotation-customer">{getPartnerName(quote.partner_id)}</p>
                </div>
                <div
                  className="quotation-status"
                  style={{
                    color: quote.state === 'sent' ? '#3b82f6' : '#64748b',
                  }}
                >
                  {quote.state === 'sent' ? (
                    <Send size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span>{quote.state === 'sent' ? 'Sent' : 'Draft'}</span>
                </div>
              </div>

              <div className="quotation-details">
                <div className="quotation-date">
                  <span className="label">Date</span>
                  <span className="value">
                    {new Date(quote.date_order).toLocaleDateString()}
                  </span>
                </div>
                <div className="quotation-amount">
                  <span className="label">Total Amount</span>
                  <span className="value amount">₹{quote.amount_total.toLocaleString()}</span>
                </div>
              </div>

              <div className="quotation-actions">
                <button
                  className="action-btn view"
                  onClick={() => handleViewVersions(quote.id)}
                  title="View Versions"
                >
                  <History size={16} />
                  Versions
                </button>
                {quote.state === 'draft' && (
                  <button
                    className="action-btn send"
                    onClick={() => handleSendQuotation(quote.id)}
                    title="Send Quotation"
                  >
                    <Mail size={16} />
                    Send
                  </button>
                )}
                <button
                  className="action-btn convert"
                  onClick={() => handleConvertToOrder(quote.id)}
                  title="Convert to Order"
                >
                  <CheckCircle size={16} />
                  Convert
                </button>
              </div>
            </div>
          ))}
        </div>

        {showVersions && selectedQuote && (
          <div className="modal-overlay" onClick={() => { setShowVersions(false); setSelectedQuote(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Quote Versions - {selectedQuote.name}</h2>
                <button onClick={() => { setShowVersions(false); setSelectedQuote(null); }}>×</button>
              </div>
              <div className="modal-body">
                <div className="versions-list">
                  {quoteVersions.length > 0 ? (
                    quoteVersions.map((version: any) => (
                      <div key={version.id} className="version-item">
                        <div className="version-header">
                          <span className="version-number">Version {version.version_number}</span>
                          <span className="version-date">
                            {new Date(version.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button className="view-version-btn">
                          <Eye size={14} />
                          View
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-versions">No previous versions found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

