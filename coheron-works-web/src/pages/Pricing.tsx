import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import './Pricing.css';

export const Pricing: React.FC = () => {
    return (
        <div className="pricing-page">
            <div className="container">
                <div className="pricing-header">
                    <h1>Simple, transparent pricing</h1>
                    <p>Choose the plan that's right for your business. No hidden fees.</p>
                </div>

                <div className="pricing-grid">
                    {/* Startup Bundle */}
                    <div className="pricing-card featured">
                        <div className="card-header">
                            <span className="badge">Most Popular</span>
                            <h3>Startup Bundle</h3>
                            <p>Everything you need to launch and grow.</p>
                        </div>
                        <div className="price">
                            <span className="currency">₹</span>
                            <span className="amount">3,999</span>
                            <span className="period">/mo</span>
                        </div>
                        <p className="billing-text">billed annually</p>

                        <div className="features-list">
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>All Modules Included</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Up to 5 Users</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>5GB Storage</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Standard Support</span>
                            </div>
                        </div>

                        <Button size="lg" fullWidth>Start Free Trial</Button>
                    </div>

                    {/* Module Based */}
                    <div className="pricing-card">
                        <div className="card-header">
                            <h3>Custom Enterprise</h3>
                            <p>Pay only for what you need.</p>
                        </div>
                        <div className="price">
                            <span className="currency">₹</span>
                            <span className="amount">999</span>
                            <span className="period">/user/app</span>
                        </div>
                        <p className="billing-text">billed monthly</p>

                        <div className="features-list">
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Select Specific Modules</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Unlimited Users</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Unlimited Storage</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Priority Support</span>
                            </div>
                            <div className="feature-item">
                                <Check size={20} className="check-icon" />
                                <span>Dedicated Account Manager</span>
                            </div>
                        </div>

                        <Button variant="secondary" size="lg" fullWidth>Contact Sales</Button>
                    </div>
                </div>

                <div className="module-pricing-table">
                    <h2>Module Pricing Breakdown</h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Module</th>
                                    <th>Price per User/Mo</th>
                                    <th>Features</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>CRM</td>
                                    <td>₹999</td>
                                    <td>Pipeline, Leads, Customers</td>
                                </tr>
                                <tr>
                                    <td>Sales</td>
                                    <td>₹799</td>
                                    <td>Quotations, Orders, Invoicing</td>
                                </tr>
                                <tr>
                                    <td>Inventory</td>
                                    <td>₹1,199</td>
                                    <td>Stock, Warehouses, Barcode</td>
                                </tr>
                                <tr>
                                    <td>Accounting</td>
                                    <td>₹1,599</td>
                                    <td>Invoices, Payments, Reports</td>
                                </tr>
                                <tr>
                                    <td>HR</td>
                                    <td>₹799</td>
                                    <td>Employees, Recruitment, Time Off</td>
                                </tr>
                                <tr>
                                    <td>Projects</td>
                                    <td>₹1,199</td>
                                    <td>Tasks, Timesheets, Planning</td>
                                </tr>
                                <tr>
                                    <td>Support</td>
                                    <td>₹1,499</td>
                                    <td>Tickets, SLA, Help Center</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
