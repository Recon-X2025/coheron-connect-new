import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ShoppingCart, Package, FileText, Users, FolderKanban, LifeBuoy, Factory, Megaphone, Store } from 'lucide-react';
import { Button } from '../components/Button';
import './LandingPage.css';

import heroImage from '../assets/images/Hero Page Image.png';

export const LandingPage: React.FC = () => {
    return (
        <div className="landing-page">
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1>Build the future with CoheronWorks</h1>
                        <p className="hero-subtitle">
                            The ultimate platform for modern teams to build, deploy, and scale their applications with ease.
                            Experience the power of next-gen development tools.
                        </p>
                        <div className="hero-actions">
                            <Link to="/signup">
                                <Button size="lg" icon={<ArrowRight size={20} />}>Start Building</Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="secondary" size="lg">View Demo</Button>
                            </Link>
                        </div>
                    </div>
                    <div className="hero-image">
                        <img 
                            src={heroImage} 
                            alt="CoheronWorks ERP Dashboard" 
                            className="hero-image-content"
                        />
                    </div>
                </div>
            </section>

            <section id="capabilities" className="capabilities-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Everything you need to run your business</h2>
                        <p>A complete suite of integrated apps to manage every aspect of your company.</p>
                    </div>

                    <div className="capabilities-grid">
                        <Link to="/crm/pipeline" className="capability-card">
                            <div className="capability-icon crm">
                                <BarChart3 size={32} />
                            </div>
                            <h3>CRM</h3>
                            <p>Track leads, close opportunities, and get accurate forecasts.</p>
                        </Link>

                        <Link to="/sales/orders" className="capability-card">
                            <div className="capability-icon sales">
                                <ShoppingCart size={32} />
                            </div>
                            <h3>Sales</h3>
                            <p>Create professional quotations and manage sales orders efficiently.</p>
                        </Link>

                        <Link to="/inventory/products" className="capability-card">
                            <div className="capability-icon inventory">
                                <Package size={32} />
                            </div>
                            <h3>Inventory</h3>
                            <p>Manage stock levels, warehouses, and product variants with ease.</p>
                        </Link>

                        <Link to="/accounting/invoices" className="capability-card">
                            <div className="capability-icon accounting">
                                <FileText size={32} />
                            </div>
                            <h3>Accounting</h3>
                            <p>Invoicing, payments, and financial reports in one place.</p>
                        </Link>

                        <Link to="/hr/employees" className="capability-card">
                            <div className="capability-icon hr">
                                <Users size={32} />
                            </div>
                            <h3>HR</h3>
                            <p>Manage employees, attendance, and recruitment processes.</p>
                        </Link>

                        <Link to="/projects" className="capability-card">
                            <div className="capability-icon projects">
                                <FolderKanban size={32} />
                            </div>
                            <h3>Projects</h3>
                            <p>Organize tasks, track progress, and deliver projects on time.</p>
                        </Link>

                        <Link to="/support/tickets" className="capability-card">
                            <div className="capability-icon support">
                                <LifeBuoy size={32} />
                            </div>
                            <h3>Support</h3>
                            <p>Handle customer tickets and provide excellent support.</p>
                        </Link>

                        <Link to="/manufacturing/orders" className="capability-card">
                            <div className="capability-icon manufacturing">
                                <Factory size={32} />
                            </div>
                            <h3>Manufacturing</h3>
                            <p>Plan production, manage work orders, and track manufacturing processes.</p>
                        </Link>

                        <Link to="/marketing/campaigns" className="capability-card">
                            <div className="capability-icon marketing">
                                <Megaphone size={32} />
                            </div>
                            <h3>Marketing</h3>
                            <p>Create and manage marketing campaigns to grow your business.</p>
                        </Link>

                        <Link to="/pos" className="capability-card">
                            <div className="capability-icon pos">
                                <Store size={32} />
                            </div>
                            <h3>POS</h3>
                            <p>Point of sale system for retail and in-store transactions.</p>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};
