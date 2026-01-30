import React, { useState } from 'react';
import { CheckSquare, Square, MoreVertical, Trash2, Edit, UserPlus } from 'lucide-react';
import { confirmAction } from '../../components/ConfirmDialog';
import './BulkActions.css';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (selectedIds: number[]) => Promise<void> | void;
  variant?: 'default' | 'danger' | 'primary';
  confirmMessage?: string;
}

interface BulkActionsProps {
  selectedIds: number[];
  totalCount: number;
  onSelectionChange: (ids: number[]) => void;
  actions: BulkAction[];
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedIds,
  totalCount,
  onSelectionChange,
  actions,
  onSelectAll,
  onDeselectAll,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const allSelected = selectedIds.length === totalCount && totalCount > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < totalCount;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    } else {
      // Default: select all visible items
      // This would need to be implemented based on current page items
    }
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
    if (onDeselectAll) {
      onDeselectAll();
    }
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  const handleAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) {
      return;
    }

    // Show confirmation if required
    if (action.confirmMessage) {
      const confirmed = await confirmAction({
        title: 'Confirm Action',
        message: `${action.confirmMessage}\n\nThis will affect ${selectedIds.length} item(s).`,
        confirmLabel: 'Confirm',
        variant: action.variant === 'danger' ? 'danger' : 'warning',
      });
      if (!confirmed) {
        return;
      }
    }

    setIsProcessing(true);
    setShowMenu(false);

    try {
      await action.action(selectedIds);
      // Clear selection after successful action
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
      // Error handling would be done by the action itself
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedIds.length === 0 && !showMenu) {
    return null;
  }

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-info">
        <button
          className="bulk-select-toggle"
          onClick={handleToggleSelectAll}
          aria-label={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? (
            <CheckSquare size={18} className="selected" />
          ) : someSelected ? (
            <CheckSquare size={18} className="partial" />
          ) : (
            <Square size={18} />
          )}
        </button>
        <span className="bulk-selection-count">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${totalCount} total`}
        </span>
        {selectedIds.length > 0 && (
          <button
            className="bulk-clear"
            onClick={handleDeselectAll}
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-actions-menu">
          {actions.map((action) => (
            <button
              key={action.id}
              className={`bulk-action-btn ${action.variant || 'default'}`}
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              title={action.label}
            >
              {action.icon || <Edit size={16} />}
              <span>{action.label}</span>
            </button>
          ))}

          {actions.length > 3 && (
            <div className="bulk-actions-dropdown">
              <button
                className="bulk-action-more"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More actions"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="bulk-actions-dropdown-menu">
                  {actions.slice(3).map((action) => (
                    <button
                      key={action.id}
                      className={`bulk-action-dropdown-item ${action.variant || 'default'}`}
                      onClick={() => handleAction(action)}
                      disabled={isProcessing}
                    >
                      {action.icon || <Edit size={16} />}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="bulk-actions-processing">
          <div className="processing-spinner"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

// Common bulk actions factory
export const createCommonBulkActions = (
  onDelete: (ids: number[]) => Promise<void>,
  onAssign?: (ids: number[]) => Promise<void>,
  onUpdate?: (ids: number[]) => Promise<void>
): BulkAction[] => {
  const actions: BulkAction[] = [];

  if (onUpdate) {
    actions.push({
      id: 'update',
      label: 'Update',
      icon: <Edit size={16} />,
      action: onUpdate,
      variant: 'default',
    });
  }

  if (onAssign) {
    actions.push({
      id: 'assign',
      label: 'Assign',
      icon: <UserPlus size={16} />,
      action: onAssign,
      variant: 'default',
    });
  }

  actions.push({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 size={16} />,
    action: onDelete,
    variant: 'danger',
    confirmMessage: 'Are you sure you want to delete the selected items?',
  });

  return actions;
};

export default BulkActions;

