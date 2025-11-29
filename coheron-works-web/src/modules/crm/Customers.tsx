import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, Building, User, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { partnerService } from '../../services/odooService';
import { PartnerForm } from './components/PartnerForm';
import { showToast } from '../../components/Toast';
import type { Partner } from '../../types/odoo';
import './Customers.css';

export const Customers = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'contact'>('all');
    const [showPartnerForm, setShowPartnerForm] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const partnersData = await partnerService.getAll();
            setPartners(partnersData);
        } finally {
            setLoading(false);
        }
    };

    const filteredPartners = partners.filter(partner => {
        const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            partner.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || partner.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const companies = filteredPartners.filter(p => p.type === 'company');
    const contacts = filteredPartners.filter(p => p.type === 'contact');

    if (loading) {
        return <div className="customers-page"><div className="container"><h1>Loading...</h1></div></div>;
    }

    return (
        <div className="customers-page">
            <div className="container">
                <div className="customers-header">
                    <div>
                        <h1>Customers</h1>
                        <p className="customers-subtitle">
                            {companies.length} companies, {contacts.length} contacts
                        </p>
                    </div>
                    <Button icon={<Plus size={20} />} onClick={() => {
                        setEditingPartner(null);
                        setShowPartnerForm(true);
                    }}>New Customer</Button>
                </div>

                {/* Toolbar */}
                <div className="customers-toolbar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="type-filter">
                        <button
                            className={typeFilter === 'all' ? 'active' : ''}
                            onClick={() => setTypeFilter('all')}
                        >
                            All ({filteredPartners.length})
                        </button>
                        <button
                            className={typeFilter === 'company' ? 'active' : ''}
                            onClick={() => setTypeFilter('company')}
                        >
                            Companies ({companies.length})
                        </button>
                        <button
                            className={typeFilter === 'contact' ? 'active' : ''}
                            onClick={() => setTypeFilter('contact')}
                        >
                            Contacts ({contacts.length})
                        </button>
                    </div>
                </div>

                {/* Customer Grid */}
                <div className="customers-grid">
                    {filteredPartners.map(partner => (
                        <Card key={partner.id} className="customer-card">
                            <div className="customer-card-header">
                                <div className="customer-avatar">
                                    {partner.type === 'company' ? (
                                        <Building size={24} />
                                    ) : (
                                        <User size={24} />
                                    )}
                                </div>
                                <div className="customer-actions">
                                    <button className="action-btn" title="Edit" onClick={() => {
                                        setEditingPartner(partner);
                                        setShowPartnerForm(true);
                                    }}>
                                        <Edit size={16} />
                                    </button>
                                    <button className="action-btn delete" title="Delete" onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete ${partner.name}?`)) {
                                            try {
                                                await partnerService.delete(partner.id);
                                                showToast('Customer deleted successfully', 'success');
                                                await loadData();
                                            } catch (error: any) {
                                                showToast(error?.message || 'Failed to delete customer', 'error');
                                            }
                                        }
                                    }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="customer-info">
                                <h3>{partner.name}</h3>
                                <span className="customer-type">{partner.type}</span>
                            </div>

                            {partner.company && partner.type === 'contact' && (
                                <div className="customer-company">
                                    <Building size={14} />
                                    <span>{partner.company}</span>
                                </div>
                            )}

                            <div className="customer-contact">
                                <div className="contact-item">
                                    <Mail size={14} />
                                    <span>{partner.email}</span>
                                </div>
                                <div className="contact-item">
                                    <Phone size={14} />
                                    <span>{partner.phone}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredPartners.length === 0 && (
                    <div className="empty-state">
                        <p>No customers found</p>
                    </div>
                )}

                {showPartnerForm && (
                    <PartnerForm
                        partner={editingPartner}
                        onClose={() => {
                            setShowPartnerForm(false);
                            setEditingPartner(null);
                        }}
                        onSave={loadData}
                    />
                )}
            </div>
        </div>
    );
};
