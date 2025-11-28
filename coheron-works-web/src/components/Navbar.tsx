import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout as LayoutIcon, Menu, X } from 'lucide-react';
import { Button } from './Button';
import './Navbar.css';

export const Navbar: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;
    const isHrActive = location.pathname.startsWith('/hr');

    return (
        <nav className="navbar glass-panel">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <div className="logo-icon">
                        <LayoutIcon size={24} color="white" />
                    </div>
                    <span className="brand-name">CoheronWorks</span>
                </Link>


                <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                    {location.pathname === '/' ? (
                        <>
                            <a href="#features" className="nav-link">Features</a>
                            <Link to="/pricing" className="nav-link">Pricing</Link>
                            <a href="#about" className="nav-link">About</a>
                        </>
                    ) : (
                        <>
                            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                                Dashboard
                            </Link>
                            <Link to="/crm/pipeline" className={`nav-link ${location.pathname.startsWith('/crm') ? 'active' : ''}`}>
                                CRM
                            </Link>
                            <Link to="/sales/orders" className={`nav-link ${location.pathname.startsWith('/sales') ? 'active' : ''}`}>
                                Sales
                            </Link>
                            <Link to="/inventory/products" className={`nav-link ${location.pathname.startsWith('/inventory') ? 'active' : ''}`}>
                                Inventory
                            </Link>
                            <Link to="/accounting/invoices" className={`nav-link ${location.pathname.startsWith('/accounting') ? 'active' : ''}`}>
                                Accounting
                            </Link>
                            <Link to="/hr" className={`nav-link ${isHrActive ? 'active' : ''}`}>
                                HR
                            </Link>
                            <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                                Projects
                            </Link>
                            <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>Admin Portal</Link>
                            <Link to="/subscription" className={`nav-link ${location.pathname.startsWith('/subscription') ? 'active' : ''}`}>Subscription</Link>
                        </>
                    )}
                </div>


                <div className="navbar-actions">
                    <Link to="/login">
                        <Button variant="ghost" size="sm">Sign In</Button>
                    </Link>
                    <Link to="/signup">
                        <Button variant="primary" size="sm">Get Started</Button>
                    </Link>
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>
        </nav>
    );
};
