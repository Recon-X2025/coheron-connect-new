import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './Toast';
import { GlobalSearch } from './GlobalSearch';
import { ConfirmDialog, useConfirm, setGlobalConfirm } from './ConfirmDialog';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { confirm, dialogProps } = useConfirm();

    // Don't show sidebar on public pages
    const isPublicPage = ['/', '/login', '/signup', '/pricing', '/portal'].includes(location.pathname);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Register global confirm function
    useEffect(() => {
        setGlobalConfirm(confirm);
        return () => setGlobalConfirm(null);
    }, [confirm]);

    return (
        <div className="layout">
            <a href="#main-content" className="skip-link">Skip to content</a>
            {!isPublicPage && (
                <>
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                    {mobileMenuOpen && (
                        <div
                            className="sidebar-overlay"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}
                    <div className={mobileMenuOpen ? 'mobile-sidebar-open' : ''}>
                        <Sidebar onCollapseChange={setSidebarCollapsed} />
                    </div>
                </>
            )}
            <main id="main-content" role="main" className={`main-content ${!isPublicPage ? 'with-sidebar' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {children}
            </main>
            <footer className="footer">
                <div className="container">
                    <p>&copy; 2025 CoheronWorks. All rights reserved.</p>
                </div>
            </footer>
            <ToastContainer />
            <GlobalSearch />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
