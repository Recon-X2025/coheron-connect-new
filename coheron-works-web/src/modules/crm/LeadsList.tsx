import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Mail, Phone, TrendingUp, Edit, Trash2, CheckCircle, Check, X } from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { useServerPagination } from '../../hooks/useServerPagination';
import { Button } from '../../components/Button';
import { leadService, partnerService } from '../../services/odooService';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import { BulkActionModal } from '../../shared/components/BulkActionModal';
import { LeadConversion } from './components/LeadConversion';
import { LeadForm } from './components/LeadForm';
import { showToast } from '../../components/Toast';
import type { Lead, Partner } from '../../types/odoo';
import { confirmAction } from '../../components/ConfirmDialog';
import { useInlineEdit } from '../../hooks/useInlineEdit';
import { EditableCell } from '../../components/EditableCell';
import './LeadsList.css';

export const LeadsList = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'probability'>('revenue');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filterDomain, setFilterDomain] = useState<any[]>([]);
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkActionIds, setBulkActionIds] = useState<number[]>([]);
    const inlineEdit = useInlineEdit<Lead>();

    const {
        data: leads,
        pagination: paginationMeta,
        loading,
        setPage,
        setPageSize,
        setFilters: setServerFilters,
        refresh: loadData,
    } = useServerPagination<Lead>('/leads');

    // Sync filters to server pagination
    useEffect(() => {
        const filters: Record<string, any> = {};
        if (searchTerm) filters.search = searchTerm;
        if (stageFilter !== 'all') filters.stage = stageFilter;
        if (sortBy) filters.sort_by = sortBy;
        if (sortOrder) filters.sort_order = sortOrder;
        setServerFilters(filters);
    }, [searchTerm, stageFilter, sortBy, sortOrder, filterDomain, setServerFilters]);

    // Load partners separately
    useEffect(() => {
        partnerService.getAll().then(setPartners);
    }, []);

    const handleDelete = async (ids: number[]) => {
        const ok = await confirmAction({
            title: 'Delete Leads',
            message: `Are you sure you want to delete ${ids.length} lead(s)?`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await leadService.delete(ids[0]); // For now, delete one at a time
            showToast('Lead deleted successfully', 'success');
            await loadData();
            setSelectedIds([]);
        } catch (error: any) {
            console.error('Failed to delete lead:', error);
            showToast(error?.message || 'Failed to delete lead. Please try again.', 'error');
        }
    };

    const handleNewLead = () => {
        setEditingLead(null);
        setShowLeadForm(true);
    };

    const handleLeadSaved = () => {
        loadData();
    };

    const handleBulkUpdate = async (ids: number[]) => {
        setBulkActionIds(ids);
        setShowBulkUpdateModal(true);
    };

    const handleBulkUpdateConfirm = async (newStage: string) => {
        try {
            for (const id of bulkActionIds) {
                await apiService.update('/leads', id, { stage: newStage });
            }
            await loadData();
            setSelectedIds([]);
            setShowBulkUpdateModal(false);
            setBulkActionIds([]);
            showToast(`${bulkActionIds.length} lead(s) updated successfully`, 'success');
        } catch (error: any) {
            console.error('Failed to bulk update leads:', error);
            showToast(error?.message || 'Failed to update leads', 'error');
        }
    };

    const handleBulkAssign = async (ids: number[]) => {
        setBulkActionIds(ids);
        setShowBulkAssignModal(true);
    };

    const handleBulkAssignConfirm = async (userId: string) => {
        try {
            for (const id of bulkActionIds) {
                await apiService.update('/leads', id, { user_id: parseInt(userId) });
            }
            await loadData();
            setSelectedIds([]);
            setShowBulkAssignModal(false);
            setBulkActionIds([]);
            showToast(`${bulkActionIds.length} lead(s) assigned successfully`, 'success');
        } catch (error: any) {
            console.error('Failed to bulk assign leads:', error);
            showToast(error?.message || 'Failed to assign leads', 'error');
        }
    };

    const handleStageChange = async (leadId: number, newStage: string) => {
        try {
            await apiService.update('/leads', leadId, { stage: newStage });
            loadData();
        } catch (error) {
            console.error('Failed to update stage:', error);
            loadData();
        }
    };

    const handleInlineSave = async (leadId: number) => {
        const values = inlineEdit.saveEdit();
        try {
            await apiService.update('/leads', leadId, values);
            showToast('Lead updated successfully', 'success');
            loadData();
        } catch (error: any) {
            showToast(error?.message || 'Failed to update lead', 'error');
        }
    };

    const handleConvertSuccess = () => {
        loadData();
        setConvertingLead(null);
    };

    const getPartnerName = (partnerId: number) => {
        return partners.find(p => p.id === partnerId)?.name || 'Unknown';
    };

    const getStageColor = (stage: string) => {
        const colors: Record<string, string> = {
            new: '#64748b',
            qualified: '#3b82f6',
            proposition: '#8b5cf6',
            won: '#10b981',
            lost: '#ef4444',
        };
        return colors[stage] || '#64748b';
    };

    const getPriorityLabel = (priority: string) => {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    const paginatedLeads = leads;

    const handleSort = (field: 'name' | 'revenue' | 'probability') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const filterFields = [
        { name: 'stage', label: 'Stage', type: 'selection' as const },
        { name: 'probability', label: 'Probability', type: 'number' as const },
        { name: 'expected_revenue', label: 'Expected Revenue', type: 'number' as const },
        { name: 'priority', label: 'Priority', type: 'selection' as const },
    ];

    if (loading) {
        return (
            <div className="leads-list-page">
                <div className="container">
                    <LoadingSpinner size="medium" message="Loading leads..." />
                </div>
            </div>
        );
    }

    return (
        <div className="leads-list-page">
            <div className="container">
                <div className="leads-header">
                    <div>
                        <h1>Leads</h1>
                        <p className="leads-subtitle">{paginationMeta.total} leads found</p>
                    </div>
                    <Button icon={<Plus size={20} />} onClick={handleNewLead}>New Lead</Button>
                </div>

                {/* Filters */}
                <div className="leads-toolbar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="toolbar-actions">
                        <div className="filter-group">
                            <Filter size={20} />
                            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                                <option value="all">All Stages</option>
                                <option value="new">New</option>
                                <option value="qualified">Qualified</option>
                                <option value="proposition">Proposition</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>
                        <AdvancedFilter
                            fields={filterFields}
                            onFilterChange={setFilterDomain}
                            savedFilters={[]}
                        />
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <BulkActions
                        selectedIds={selectedIds}
                        totalCount={paginationMeta.total}
                        onSelectionChange={setSelectedIds}
                        actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
                    />
                )}

                {/* Table */}
                <div className="leads-table-container">
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedIds.length === paginatedLeads.length &&
                                            paginatedLeads.length > 0
                                        }
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(paginatedLeads.map((l) => l.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable">
                                    Lead Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Company</th>
                                <th>Contact</th>
                                <th onClick={() => handleSort('revenue')} className="sortable amount-col">
                                    Expected Revenue {sortBy === 'revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('probability')} className="sortable">
                                    Probability {sortBy === 'probability' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Stage</th>
                                <th>Priority</th>
                                <th className="actions-col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLeads.map(lead => (
                                <tr key={lead.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(lead.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, lead.id]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter((id) => id !== lead.id));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="lead-name-cell">
                                        <strong>
                                            <EditableCell
                                                editing={inlineEdit.editingId === lead.id}
                                                value={inlineEdit.editingId === lead.id ? (inlineEdit.editValues.name ?? lead.name) : lead.name}
                                                onChange={(v) => inlineEdit.updateField('name', v)}
                                                onSave={() => handleInlineSave(lead.id)}
                                                onCancel={inlineEdit.cancelEdit}
                                            />
                                        </strong>
                                    </td>
                                    <td>
                                        <EditableCell
                                            editing={inlineEdit.editingId === lead.id}
                                            value={inlineEdit.editingId === lead.id ? (inlineEdit.editValues.email ?? lead.email) : getPartnerName(lead.partner_id)}
                                            onChange={(v) => inlineEdit.updateField('email', v)}
                                            onSave={() => handleInlineSave(lead.id)}
                                            onCancel={inlineEdit.cancelEdit}
                                        />
                                    </td>
                                    <td>
                                        <div className="contact-info">
                                            <div className="contact-item">
                                                <Mail size={14} />
                                                <span>{lead.email}</span>
                                            </div>
                                            <div className="contact-item">
                                                <Phone size={14} />
                                                <span>{lead.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="revenue-cell amount-col">
                                        <TrendingUp size={16} />
                                        ₹{lead.expected_revenue.toLocaleString()}
                                    </td>
                                    <td className="probability-cell">
                                        <TrendingUp size={16} />
                                        {lead.probability}%
                                    </td>
                                    <td>
                                        {inlineEdit.editingId === lead.id ? (
                                            <EditableCell
                                                editing={true}
                                                value={inlineEdit.editValues.stage ?? lead.stage}
                                                onChange={(v) => inlineEdit.updateField('stage', v)}
                                                onSave={() => handleInlineSave(lead.id)}
                                                onCancel={inlineEdit.cancelEdit}
                                                type="select"
                                                options={[
                                                    { value: 'new', label: 'New' },
                                                    { value: 'qualified', label: 'Qualified' },
                                                    { value: 'proposition', label: 'Proposition' },
                                                    { value: 'won', label: 'Won' },
                                                    { value: 'lost', label: 'Lost' },
                                                ]}
                                            />
                                        ) : (
                                            <div className="stage-select-wrapper">
                                                <select
                                                    className="stage-select"
                                                    value={lead.stage}
                                                    onChange={(e) => handleStageChange(lead.id, e.target.value)}
                                                    style={{
                                                        backgroundColor: `${getStageColor(lead.stage)}20`,
                                                        color: getStageColor(lead.stage),
                                                        borderColor: getStageColor(lead.stage),
                                                    }}
                                                >
                                                    <option value="new">New</option>
                                                    <option value="qualified">Qualified</option>
                                                    <option value="proposition">Proposition</option>
                                                    <option value="won">Won</option>
                                                    <option value="lost">Lost</option>
                                                </select>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`priority-badge priority-${lead.priority}`}>
                                            {getPriorityLabel(lead.priority)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {inlineEdit.editingId === lead.id ? (
                                                <>
                                                    <button className="action-btn" title="Save" onClick={() => handleInlineSave(lead.id)}>
                                                        <Check size={16} />
                                                    </button>
                                                    <button className="action-btn" title="Cancel" onClick={inlineEdit.cancelEdit}>
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="action-btn convert"
                                                        title="Convert Lead"
                                                        onClick={() => setConvertingLead(lead)}
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button className="action-btn" title="Inline Edit" onClick={() => inlineEdit.startEdit(lead.id, { name: lead.name, email: lead.email, stage: lead.stage })}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        title="Delete"
                                                        onClick={() => handleDelete([lead.id])}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    pageSize={paginationMeta.limit}
                    totalItems={paginationMeta.total}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 25, 50]}
                />

                {convertingLead && (
                    <LeadConversion
                        lead={convertingLead}
                        onClose={() => setConvertingLead(null)}
                        onSuccess={handleConvertSuccess}
                    />
                )}

                {showLeadForm && (
                    <LeadForm
                        lead={editingLead || undefined}
                        onClose={() => {
                            setShowLeadForm(false);
                            setEditingLead(null);
                        }}
                        onSave={handleLeadSaved}
                    />
                )}

                <BulkActionModal
                    isOpen={showBulkUpdateModal}
                    onClose={() => {
                        setShowBulkUpdateModal(false);
                        setBulkActionIds([]);
                    }}
                    onConfirm={handleBulkUpdateConfirm}
                    title={`Update ${bulkActionIds.length} Lead(s)`}
                    label="New Stage"
                    type="select"
                    options={[
                        { value: 'new', label: 'New' },
                        { value: 'qualified', label: 'Qualified' },
                        { value: 'proposition', label: 'Proposition' },
                        { value: 'won', label: 'Won' },
                        { value: 'lost', label: 'Lost' },
                    ]}
                    confirmText="Update Leads"
                />

                <BulkActionModal
                    isOpen={showBulkAssignModal}
                    onClose={() => {
                        setShowBulkAssignModal(false);
                        setBulkActionIds([]);
                    }}
                    onConfirm={handleBulkAssignConfirm}
                    title={`Assign ${bulkActionIds.length} Lead(s)`}
                    label="User ID"
                    placeholder="Enter user ID"
                    confirmText="Assign Leads"
                />
            </div>
        </div>
    );
};
