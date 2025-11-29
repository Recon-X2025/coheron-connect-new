import { useState, useEffect } from 'react';
import { TrendingUp, Mail, Phone, User, Plus } from 'lucide-react';
import { KanbanBoard } from '../../shared/views/KanbanBoard';
import { Button } from '../../components/Button';
import { leadService, partnerService } from '../../services/odooService';
import { LeadForm } from './components/LeadForm';
import type { Lead, Partner } from '../../types/odoo';
import './CRMPipeline.css';

const PIPELINE_STAGES = [
    { id: 'new', title: 'New', color: '#64748b' },
    { id: 'qualified', title: 'Qualified', color: '#3b82f6' },
    { id: 'proposition', title: 'Proposition', color: '#8b5cf6' },
    { id: 'won', title: 'Won', color: '#10b981' },
    { id: 'lost', title: 'Lost', color: '#ef4444' },
];

export const CRMPipeline = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLeadForm, setShowLeadForm] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [leadsData, partnersData] = await Promise.all([
                leadService.getAll(),
                partnerService.getAll(),
            ]);
            setLeads(leadsData);
            setPartners(partnersData);
        } finally {
            setLoading(false);
        }
    };

    const handleLeadMove = async (leadId: number, newStage: string) => {
        // Optimistic update
        setLeads(prev => prev.map(lead =>
            lead.id === leadId ? { ...lead, stage: newStage as any } : lead
        ));

        // Update via API
        await leadService.update(leadId, { stage: newStage as any });
    };

    const getPartnerName = (partnerId: number) => {
        return partners.find(p => p.id === partnerId)?.name || 'Unknown';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            default: return '#64748b';
        }
    };

    const renderLeadCard = (lead: Lead) => (
        <div className="lead-card">
            <div className="lead-card-header">
                <h4 className="lead-title">{lead.name}</h4>
                <div
                    className="lead-priority"
                    style={{ backgroundColor: getPriorityColor(lead.priority) }}
                />
            </div>

            <div className="lead-company">
                <User size={14} />
                {getPartnerName(lead.partner_id)}
            </div>

            <div className="lead-details">
                <div className="lead-detail">
                    <Mail size={14} />
                    <span>{lead.email}</span>
                </div>
                <div className="lead-detail">
                    <Phone size={14} />
                    <span>{lead.phone}</span>
                </div>
            </div>

            <div className="lead-footer">
                <div className="lead-revenue">
                    <TrendingUp size={16} />
                    <span>₹{lead.expected_revenue.toLocaleString()}</span>
                </div>
                <div className="lead-probability">
                    <TrendingUp size={16} />
                    <span>{lead.probability}%</span>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="crm-pipeline-page">
                <div className="container">
                    <div className="pipeline-header">
                        <h1>Loading...</h1>
                    </div>
                </div>
            </div>
        );
    }

    const totalRevenue = leads.reduce((sum, lead) => sum + lead.expected_revenue, 0);
    const wonRevenue = leads.filter(l => l.stage === 'won').reduce((sum, lead) => sum + lead.expected_revenue, 0);

    return (
        <div className="crm-pipeline-page">
            <div className="container">
                <div className="pipeline-header">
                    <div>
                        <h1>Sales Pipeline</h1>
                        <p className="pipeline-subtitle">Manage your leads and opportunities</p>
                    </div>
                    <div className="pipeline-stats">
                        <div className="stat-box">
                            <span className="stat-label">Total Pipeline</span>
                            <span className="stat-value">₹{totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Won</span>
                            <span className="stat-value won">₹{wonRevenue.toLocaleString()}</span>
                        </div>
                        <Button icon={<Plus size={20} />} onClick={() => setShowLeadForm(true)}>New Lead</Button>
                    </div>
                </div>

                <KanbanBoard
                    columns={PIPELINE_STAGES}
                    items={leads}
                    onItemMove={handleLeadMove}
                    renderCard={renderLeadCard as any}
                />

                {showLeadForm && (
                    <LeadForm
                        onClose={() => setShowLeadForm(false)}
                        onSave={() => {
                            setShowLeadForm(false);
                            loadData();
                        }}
                    />
                )}
            </div>
        </div>
    );
};
