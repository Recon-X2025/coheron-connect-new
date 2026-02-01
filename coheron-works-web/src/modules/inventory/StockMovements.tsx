import { useState, useEffect } from 'react';
import { Package, ArrowLeftRight, FileText, ArrowDown, ArrowUp } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { inventoryService, type GRN, type StockTransfer, type StockAdjustment } from '../../services/inventoryService';
import { GRNList } from './components/GRNList';
import { TransferList } from './components/TransferList';
import { AdjustmentList } from './components/AdjustmentList';
import { StockIssueList } from './components/StockIssueList';
import { StockReturnList } from './components/StockReturnList';
import './StockMovements.css';

type MovementTab = 'grn' | 'transfers' | 'adjustments' | 'issues' | 'returns';

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
    { id: 'issues' as MovementTab, label: 'Stock Issues', icon: ArrowDown },
    { id: 'transfers' as MovementTab, label: 'Transfers', icon: ArrowLeftRight },
    { id: 'returns' as MovementTab, label: 'Returns', icon: ArrowUp },
    { id: 'adjustments' as MovementTab, label: 'Adjustments', icon: FileText },
  ];

  return (
    <div className="stock-movements-page">
      <div className="movements-tabs">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id || (tab as any)._id || idx}
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
            {activeTab === 'issues' && <StockIssueList onRefresh={loadData} />}
            {activeTab === 'transfers' && <TransferList transfers={transfers} onRefresh={loadData} />}
            {activeTab === 'returns' && <StockReturnList onRefresh={loadData} />}
            {activeTab === 'adjustments' && <AdjustmentList adjustments={adjustments} onRefresh={loadData} />}
          </>
        )}
      </div>
    </div>
  );
};

