import { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { odooService } from '../../services/odooService';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { showToast } from '../../components/Toast';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import { ActivityTimeline } from './components/ActivityTimeline';
import { LeadForm } from './components/LeadForm';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import type { Lead, Partner } from '../../types/odoo';
import './Opportunities.css';

// Opportunity is essentially a Lead with type='opportunity'
export interface Opportunity extends Lead {
  type: 'opportunity';
  probability: number;
  expected_revenue: number;
  date_deadline?: string;
}

export const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterDomain, setFilterDomain] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, [filterDomain]);

  const loadData = async () => {
    try {
      setLoading(true);
      const domain: any[] = [
        ['type', '=', 'opportunity'],
        ...filterDomain,
      ];

      const [oppsData, partnersData] = await Promise.all([
        odooService.search<Opportunity>('crm.lead', domain, [
          'id',
          'name',
          'partner_id',
          'email',
          'phone',
          'expected_revenue',
          'probability',
          'stage',
          'user_id',
          'create_date',
          'priority',
          'date_deadline',
        ]),
        odooService.search<Partner>('res.partner', [], ['id', 'name']),
      ]);

      setOpportunities(oppsData);
      setPartners(partnersData);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartnerName = (partnerId: number) => {
    return partners.find((p) => p.id === partnerId)?.name || 'Unknown';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      new: 'New',
      qualified: 'Qualified',
      proposition: 'Proposition',
      won: 'Won',
      lost: 'Lost',
    };
    return labels[stage] || stage;
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span style={{ color: '#ef4444' }}>🔴</span>;
      case 'medium':
        return <span style={{ color: '#f59e0b' }}>🟡</span>;
      case 'low':
        return <span style={{ color: '#64748b' }}>⚪</span>;
      default:
        return null;
    }
  };

  const handleDelete = async (ids: number[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} opportunity/ies?`)) {
      try {
        await odooService.unlink('crm.lead', ids);
        await loadData();
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete opportunities:', error);
      }
    }
  };

  const handleBulkUpdate = async (ids: number[]) => {
    // This would open a bulk update dialog
    console.log('Bulk update for:', ids);
  };

  const handleBulkAssign = async (ids: number[]) => {
    // This would open an assign dialog
    console.log('Bulk assign for:', ids);
  };

  const handleStageChange = async (oppId: number, newStage: string) => {
    try {
      // Optimistic update
      setOpportunities(prev => prev.map(opp =>
        opp.id === oppId ? { ...opp, stage: newStage as any } : opp
      ));

      // Update via API
      await apiService.update('/leads', oppId, { stage: newStage });
    } catch (error) {
      console.error('Failed to update stage:', error);
      // Revert on error
      loadData();
    }
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      opp.name.toLowerCase().includes(searchLower) ||
      getPartnerName(opp.partner_id).toLowerCase().includes(searchLower) ||
      opp.email?.toLowerCase().includes(searchLower)
    );
  });

  const filterFields = [
    { name: 'stage', label: 'Stage', type: 'selection' as const },
    { name: 'probability', label: 'Probability', type: 'number' as const },
    { name: 'expected_revenue', label: 'Expected Revenue', type: 'number' as const },
    { name: 'priority', label: 'Priority', type: 'selection' as const },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeOpp = filteredOpportunities.find(opp => opp.id === active.id);
      const overStage = over.id as string;

      // Check if over.id is a stage (column) or another opportunity
      const isStage = ['new', 'qualified', 'proposition', 'won', 'lost'].includes(overStage);
      
      if (activeOpp && isStage && activeOpp.stage !== overStage) {
        handleStageChange(activeOpp.id, overStage);
      }
    }

    setActiveId(null);
  };

  // Draggable Card Component
  const DraggableCard = ({ opportunity }: { opportunity: Opportunity }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: opportunity.id,
    });

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.5 : 1,
        }
      : { opacity: isDragging ? 0.5 : 1 };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`kanban-card ${isDragging ? 'dragging' : ''}`}
        onClick={() => {
          if (activeId === null) {
            setSelectedOpportunity(opportunity);
          }
        }}
      >
        <div className="kanban-card-header">
          <strong>{opportunity.name}</strong>
          {getPriorityIcon(opportunity.priority)}
        </div>
        <div className="kanban-card-body">
          <p className="kanban-partner">
            {getPartnerName(opportunity.partner_id)}
          </p>
          <p className="kanban-revenue">
                          {formatInLakhsCompact(opportunity.expected_revenue)}
          </p>
          <p className="kanban-probability">
            {opportunity.probability}% probability
          </p>
        </div>
      </div>
    );
  };

  // Droppable Column Component
  const DroppableColumn = ({ stage, children }: { stage: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: stage,
    });

    return (
      <div
        ref={setNodeRef}
        className={`kanban-column ${isOver ? 'drag-over' : ''}`}
      >
        {children}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="opportunities-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading opportunities..." />
        </div>
      </div>
    );
  }

  return (
    <div className="opportunities-page">
      <div className="container">
        <div className="opportunities-header">
          <div>
            <h1>Opportunities</h1>
            <p className="opportunities-subtitle">
              {filteredOpportunities.length} opportunity/ies found
            </p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowOpportunityForm(true)}>New Opportunity</Button>
        </div>

        <div className="opportunities-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="toolbar-actions">
            <AdvancedFilter
              fields={filterFields}
              onFilterChange={setFilterDomain}
              savedFilters={[]}
            />
            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button
                className={viewMode === 'kanban' ? 'active' : ''}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <BulkActions
            selectedIds={selectedIds}
            totalCount={filteredOpportunities.length}
            onSelectionChange={setSelectedIds}
            actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
          />
        )}

        {viewMode === 'list' ? (
          <div className="opportunities-table-container">
            <table className="opportunities-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredOpportunities.length &&
                        filteredOpportunities.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredOpportunities.map((o) => o.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th>Opportunity Name</th>
                  <th>Customer</th>
                  <th>Expected Revenue</th>
                  <th>Probability</th>
                  <th>Stage</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(opp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, opp.id]);
                          } else {
                            setSelectedIds(selectedIds.filter((id) => id !== opp.id));
                          }
                        }}
                      />
                    </td>
                    <td className="opportunity-name-cell">
                      <strong>{opp.name}</strong>
                    </td>
                    <td>{getPartnerName(opp.partner_id)}</td>
                    <td className="revenue-cell">
                      <TrendingUp size={16} />
                      ₹{opp.expected_revenue.toLocaleString()}
                    </td>
                    <td className="probability-cell">
                      <TrendingUp size={16} />
                      {opp.probability}%
                    </td>
                    <td>
                      <div className="stage-select-wrapper">
                        <select
                          className="stage-select"
                          value={opp.stage}
                          onChange={(e) => handleStageChange(opp.id, e.target.value)}
                          style={{
                            backgroundColor: `${getStageColor(opp.stage)}20`,
                            color: getStageColor(opp.stage),
                            borderColor: getStageColor(opp.stage),
                          }}
                        >
                          <option value="new">New</option>
                          <option value="qualified">Qualified</option>
                          <option value="proposition">Proposition</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      {opp.date_deadline
                        ? new Date(opp.date_deadline).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          title="View Details"
                          onClick={() => setSelectedOpportunity(opp)}
                        >
                          <Eye size={16} />
                        </button>
                        <button className="action-btn" title="Edit" onClick={() => {
                          setEditingOpportunity(opp);
                          setShowOpportunityForm(true);
                        }}>
                          <Edit size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          title="Delete"
                          onClick={() => handleDelete([opp.id])}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="opportunities-kanban">
              <div className="kanban-columns">
                {(['new', 'qualified', 'proposition', 'won', 'lost'] as const).map((stage) => (
                  <DroppableColumn key={stage} stage={stage}>
                    <div className="kanban-header">
                      <h3>{getStageLabel(stage)}</h3>
                      <span className="kanban-count">
                        {filteredOpportunities.filter((o) => o.stage === stage).length}
                      </span>
                    </div>
                    <div className="kanban-cards">
                      {filteredOpportunities
                        .filter((opportunity) => opportunity.stage === stage)
                        .map((opportunity) => (
                          <DraggableCard key={opportunity.id} opportunity={opportunity} />
                        ))}
                    </div>
                  </DroppableColumn>
                ))}
              </div>
            </div>
            <DragOverlay>
              {activeId ? (
                (() => {
                  const activeOpp = filteredOpportunities.find(opp => opp.id === activeId);
                  return activeOpp ? (
                    <div className="kanban-card drag-overlay">
                      <div className="kanban-card-header">
                        <strong>{activeOpp.name}</strong>
                        {getPriorityIcon(activeOpp.priority)}
                      </div>
                      <div className="kanban-card-body">
                        <p className="kanban-partner">
                          {getPartnerName(activeOpp.partner_id)}
                        </p>
                        <p className="kanban-revenue">
                          ₹{activeOpp.expected_revenue.toLocaleString()}
                        </p>
                        <p className="kanban-probability">
                          {activeOpp.probability}% probability
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {selectedOpportunity && (
          <div className="opportunity-detail-modal" onClick={() => setSelectedOpportunity(null)}>
            <div className="opportunity-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="opportunity-detail-header">
                <h2>{selectedOpportunity.name}</h2>
                <button onClick={() => setSelectedOpportunity(null)}>×</button>
              </div>
              <div className="opportunity-detail-body">
                <div className="opportunity-info">
                  <div className="info-item">
                    <strong>Customer:</strong> {getPartnerName(selectedOpportunity.partner_id)}
                  </div>
                  <div className="info-item">
                    <strong>Expected Revenue:</strong> ₹
                    {selectedOpportunity.expected_revenue.toLocaleString()}
                  </div>
                  <div className="info-item">
                    <strong>Probability:</strong> {selectedOpportunity.probability}%
                  </div>
                  <div className="info-item">
                    <strong>Stage:</strong>{' '}
                    <div className="stage-select-wrapper">
                      <select
                        className="stage-select"
                        value={selectedOpportunity.stage}
                        onChange={(e) => {
                          handleStageChange(selectedOpportunity.id, e.target.value);
                          setSelectedOpportunity({ ...selectedOpportunity, stage: e.target.value as any });
                        }}
                        style={{
                          backgroundColor: `${getStageColor(selectedOpportunity.stage)}20`,
                          color: getStageColor(selectedOpportunity.stage),
                          borderColor: getStageColor(selectedOpportunity.stage),
                        }}
                      >
                        <option value="new">New</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposition">Proposition</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                </div>
                <ActivityTimeline
                  resId={selectedOpportunity.id}
                  resModel="crm.lead"
                />
              </div>
            </div>
          </div>
        )}

        {showOpportunityForm && (
          <LeadForm
            lead={editingOpportunity || undefined}
            onClose={() => {
              setShowOpportunityForm(false);
              setEditingOpportunity(null);
            }}
            onSave={() => {
              setShowOpportunityForm(false);
              setEditingOpportunity(null);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

