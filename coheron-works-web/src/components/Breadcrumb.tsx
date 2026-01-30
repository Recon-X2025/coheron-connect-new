import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './Breadcrumb.css';

const labelMap: Record<string, string> = {
    crm: 'CRM',
    hr: 'HR',
    pos: 'POS',
    lms: 'LMS',
    itsm: 'ITSM',
    bom: 'BOM',
    sales: 'Sales',
    inventory: 'Inventory',
    accounting: 'Accounting',
    manufacturing: 'Manufacturing',
    marketing: 'Marketing',
    support: 'Support',
    projects: 'Projects',
    website: 'Website',
    admin: 'Admin',
    dashboard: 'Dashboard',
    settings: 'Settings',
};

function formatSegment(segment: string): string {
    if (labelMap[segment]) return labelMap[segment];
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const hiddenPaths = ['/', '/login', '/signup', '/pricing'];

export const Breadcrumb: React.FC = () => {
    const location = useLocation();

    if (hiddenPaths.includes(location.pathname)) return null;

    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    return (
        <nav className="breadcrumb" aria-label="Breadcrumb">
            {segments.map((segment, index) => {
                const path = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;
                return (
                    <React.Fragment key={path}>
                        {index > 0 && <ChevronRight className="breadcrumb-separator" size={14} />}
                        {isLast ? (
                            <span className="breadcrumb-current">{formatSegment(segment)}</span>
                        ) : (
                            <Link className="breadcrumb-link" to={path}>{formatSegment(segment)}</Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};
