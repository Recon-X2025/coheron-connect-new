import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ChevronRight, ChevronDown, X, BookOpen } from 'lucide-react';
import { Button } from '../../components/Button';
import { chartOfAccountsService } from '../../services/accountingService';
import { showToast } from '../../components/Toast';
import { AccountForm } from './components/AccountForm';
import { confirmAction } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowEditModal(true);
  };

  const handleDeleteAccount = async (accountId: number) => {
    const ok = await confirmAction({
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await chartOfAccountsService.delete(accountId);
      await loadAccounts();
      showToast('Account deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast('Failed to delete account. Please try again.', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;

    try {
      await chartOfAccountsService.update(editingAccount.id, {
        code: editingAccount.code,
        name: editingAccount.name,
        account_type: editingAccount.account_type,
      });
      await loadAccounts();
      setShowEditModal(false);
      setEditingAccount(null);
      showToast('Account updated successfully', 'success');
    } catch (error) {
      console.error('Error updating account:', error);
      showToast('Failed to update account. Please try again.', 'error');
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await chartOfAccountsService.getAll() as Account[];
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

  const renderAccount = (account: Account, depth: number = 0, idx: number = 0) => {
    const hasChildren = (account.child_count || 0) > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const children = getChildAccounts(account.id);

    return (
      <div key={account.id || (account as any)._id || idx}>
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
            <button 
              type="button"
              className="action-btn" 
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                handleEditAccount(account);
              }}
            >
              <Edit size={16} />
            </button>
            {!account.deprecated && (
              <button 
                type="button"
                className="action-btn delete" 
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAccount(account.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="account-children">
            {children.map((child, idx) => <React.Fragment key={child.id || (child as any)._id || idx}>{renderAccount(child, depth + 1, idx)}</React.Fragment>)}
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
          <Button icon={<Plus size={20} />} onClick={() => setShowAccountForm(true)}>New Account</Button>
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
              {rootAccounts.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={48} />}
                  title="No accounts found"
                  description="Set up your chart of accounts to organize your financial data"
                  actionLabel="New Account"
                  onAction={() => setShowAccountForm(true)}
                />
              ) : (
                rootAccounts.map((account, idx) => <React.Fragment key={account.id || (account as any)._id || idx}>{renderAccount(account, 0, idx)}</React.Fragment>)
              )}
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

        {/* Edit Account Modal */}
        {showEditModal && editingAccount && (
          <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingAccount(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Account</h2>
                <button type="button" className="modal-close" onClick={() => { setShowEditModal(false); setEditingAccount(null); }}>
                  <X size={20} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="edit-account-code">Account Code</label>
                <input
                  type="text"
                  id="edit-account-code"
                  name="account-code"
                  value={editingAccount.code}
                  onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-account-name">Account Name</label>
                <input
                  type="text"
                  id="edit-account-name"
                  name="account-name"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-account-type">Account Type</label>
                <select
                  id="edit-account-type"
                  name="account-type"
                  value={editingAccount.account_type}
                  onChange={(e) => setEditingAccount({ ...editingAccount, account_type: e.target.value })}
                >
                  <option value="asset_current">Current Asset</option>
                  <option value="asset_non_current">Non-Current Asset</option>
                  <option value="liability_current">Current Liability</option>
                  <option value="liability_non_current">Non-Current Liability</option>
                  <option value="equity">Equity</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingAccount(null); }}>Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}

        {showAccountForm && (
          <AccountForm
            onClose={() => setShowAccountForm(false)}
            onSave={() => {
              setShowAccountForm(false);
              loadAccounts();
            }}
          />
        )}
      </div>
    </div>
  );
};

