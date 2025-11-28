import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '../../components/Button';
import { chartOfAccountsService } from '../../services/accountingService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './ChartOfAccounts.css';

interface Account {
  id: number;
  code: string;
  name: string;
  account_type: string;
  parent_id: number | null;
  level: number;
  reconcile: boolean;
  deprecated: boolean;
  child_count?: number;
}

export const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await chartOfAccountsService.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId: number) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getAccountTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAccountTypeColor = (type: string) => {
    if (type.startsWith('asset')) return 'asset';
    if (type.startsWith('liability')) return 'liability';
    if (type.startsWith('equity')) return 'equity';
    if (type.startsWith('income')) return 'income';
    if (type.startsWith('expense')) return 'expense';
    return 'default';
  };

  const filteredAccounts = accounts.filter(account =>
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rootAccounts = filteredAccounts.filter(a => !a.parent_id);
  const getChildAccounts = (parentId: number) => 
    filteredAccounts.filter(a => a.parent_id === parentId);

  const renderAccount = (account: Account, depth: number = 0) => {
    const hasChildren = (account.child_count || 0) > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const children = getChildAccounts(account.id);

    return (
      <div key={account.id}>
        <div 
          className={`account-row ${selectedAccount?.id === account.id ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => setSelectedAccount(account)}
        >
          <div className="account-expand">
            {hasChildren ? (
              <button
                className="expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(account.id);
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="expand-spacer" />
            )}
          </div>
          <div className="account-code">{account.code}</div>
          <div className="account-name">{account.name}</div>
          <div className={`account-type ${getAccountTypeColor(account.account_type)}`}>
            {getAccountTypeLabel(account.account_type)}
          </div>
          <div className="account-reconcile">
            {account.reconcile && <span className="reconcile-badge">Reconcile</span>}
          </div>
          <div className="account-actions">
            <button className="action-btn" title="Edit">
              <Edit size={16} />
            </button>
            {!account.deprecated && (
              <button className="action-btn delete" title="Delete">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="account-children">
            {children.map(child => renderAccount(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="chart-of-accounts-page"><div className="container"><h1>Loading...</h1></div></div>;
  }

  return (
    <div className="chart-of-accounts-page">
      <div className="container">
        <div className="coa-header">
          <div>
            <h1>Chart of Accounts</h1>
            <p className="coa-subtitle">{accounts.length} accounts</p>
          </div>
          <Button icon={<Plus size={20} />}>New Account</Button>
        </div>

        <div className="coa-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="coa-content">
          <div className="coa-tree">
            <div className="coa-table-header">
              <div className="account-expand"> </div>
              <div className="account-code">Code</div>
              <div className="account-name">Name</div>
              <div className="account-type">Type</div>
              <div className="account-reconcile">Reconcile</div>
              <div className="account-actions">Actions</div>
            </div>
            <div className="coa-table-body">
              {rootAccounts.map(account => renderAccount(account))}
            </div>
          </div>

          {selectedAccount && (
            <div className="coa-details">
              <h3>Account Details</h3>
              <div className="detail-item">
                <label>Code:</label>
                <span>{selectedAccount.code}</span>
              </div>
              <div className="detail-item">
                <label>Name:</label>
                <span>{selectedAccount.name}</span>
              </div>
              <div className="detail-item">
                <label>Type:</label>
                <span>{getAccountTypeLabel(selectedAccount.account_type)}</span>
              </div>
              <div className="detail-item">
                <label>Level:</label>
                <span>{selectedAccount.level}</span>
              </div>
              <div className="detail-item">
                <label>Reconcile:</label>
                <span>{selectedAccount.reconcile ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

