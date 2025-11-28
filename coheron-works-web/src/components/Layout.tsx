import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Don't show sidebar on public pages
    const isPublicPage = ['/', '/login', '/signup', '/pricing', '/portal'].includes(location.pathname);

    return (
        <div className="layout">
            {!isPublicPage && <Sidebar onCollapseChange={setSidebarCollapsed} />}
            <main className={`main-content ${!isPublicPage ? 'with-sidebar' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {children}
            </main>
            <footer className="footer">
                <div className="container">
                    <p>&copy; 2025 CoheronWorks. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};
