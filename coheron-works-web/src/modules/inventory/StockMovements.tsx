import { useState, useEffect } from 'react';
import { Package, ArrowLeftRight, FileText, Search, Plus, Filter } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { inventoryService, type GRN, type StockTransfer, type StockAdjustment } from '../../services/inventoryService';
import { GRNList } from './components/GRNList';
import { TransferList } from './components/TransferList';
import { AdjustmentList } from './components/AdjustmentList';
import './StockMovements.css';

type MovementTab = 'grn' | 'transfers' | 'adjustments';

export const StockMovements = () => {
  const [activeTab, setActiveTab] = useState<MovementTab>('grn');
  const [grns, setGrns] = useState<GRN[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'grn':
          const grnData = await inventoryService.getGRNs();
          setGrns(grnData);
          break;
        case 'transfers':
          const transferData = await inventoryService.getTransfers();
          setTransfers(transferData);
          break;
        case 'adjustments':
          const adjustmentData = await inventoryService.getAdjustments();
          setAdjustments(adjustmentData);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'grn' as MovementTab, label: 'Goods Receipt (GRN)', icon: Package },
    { id: 'transfers' as MovementTab, label: 'Transfers', icon: ArrowLeftRight },
    { id: 'adjustments' as MovementTab, label: 'Adjustments', icon: FileText },
  ];

  return (
    <div className="stock-movements-page">
      <div className="movements-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`movement-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="movements-content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 'grn' && <GRNList grns={grns} onRefresh={loadData} />}
            {activeTab === 'transfers' && <TransferList transfers={transfers} onRefresh={loadData} />}
            {activeTab === 'adjustments' && <AdjustmentList adjustments={adjustments} onRefresh={loadData} />}
          </>
        )}
      </div>
    </div>
  );
};

