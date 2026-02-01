import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    Package,
    Calculator,
    UserCog,
    Factory,
    Megaphone,
    ShoppingCart,
    Headphones,
    FolderKanban,
    Settings,
    Shield,
    CreditCard,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    FileText,
    Clock,
    Calendar,
    UserPlus,
    UserMinus,
    GraduationCap,
    BarChart3,
    Receipt,
    Zap,
    PenTool,
    AlertCircle,
    Mail,
    FileCheck,
    Layers,
    Settings2,
    Wrench,
    ClipboardCheck,
    DollarSign,
    ArrowLeft,
    Barcode,
    ArrowUp,
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    children?: NavItem[];
}

interface SidebarProps {
    onCollapseChange?: (collapsed: boolean) => void;
}

const getNavigationItems = (): NavItem[] => [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: <LayoutDashboard size={20} />,
        },
        {
            label: 'CRM',
            path: '/crm',
            icon: <Users size={20} />,
            children: [
                { label: 'Dashboard', path: '/crm/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Pipeline', path: '/crm/pipeline', icon: <TrendingUp size={18} /> },
                { label: 'Leads', path: '/crm/leads', icon: <FileText size={18} /> },
                { label: 'Opportunities', path: '/crm/opportunities', icon: <BarChart3 size={18} /> },
                { label: 'Customers', path: '/crm/customers', icon: <Users size={18} /> },
                { label: 'Tasks & Calendar', path: '/crm/tasks', icon: <Calendar size={18} /> },
                { label: 'Automation Engine', path: '/crm/automation', icon: <Zap size={18} /> },
            ],
        },
        {
            label: 'Sales',
            path: '/sales',
            icon: <TrendingUp size={20} />,
            children: [
                { label: 'Dashboard', path: '/sales/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Orders', path: '/sales/orders', icon: <ShoppingCart size={18} /> },
                { label: 'Quotations', path: '/sales/quotations', icon: <FileCheck size={18} /> },
                { label: 'Pricing Management', path: '/sales/pricing', icon: <DollarSign size={18} /> },
                { label: 'Contracts', path: '/sales/contracts', icon: <FileText size={18} /> },
                { label: 'Delivery Tracking', path: '/sales/delivery', icon: <Package size={18} /> },
                { label: 'Returns', path: '/sales/returns', icon: <ArrowLeft size={18} /> },
                { label: 'Forecasting', path: '/sales/forecasting', icon: <TrendingUp size={18} /> },
                { label: 'Team Performance', path: '/sales/team', icon: <Users size={18} /> },
            ],
        },
        {
            label: 'Inventory',
            path: '/inventory',
            icon: <Package size={20} />,
            children: [
                { label: 'Dashboard', path: '/inventory/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Products', path: '/inventory/products', icon: <Package size={18} /> },
                { label: 'Warehouses', path: '/inventory/warehouses', icon: <Package size={18} /> },
                { label: 'Stock Movements', path: '/inventory/movements', icon: <ArrowUp size={18} /> },
                { label: 'Batch & Serial', path: '/inventory/batch-serial', icon: <Barcode size={18} /> },
                { label: 'Warehouse Operations', path: '/inventory/warehouse-ops', icon: <Settings2 size={18} /> },
                { label: 'Reports', path: '/inventory/reports', icon: <BarChart3 size={18} /> },
                { label: 'Settings', path: '/inventory/settings', icon: <Settings2 size={18} /> },
            ],
        },
        {
            label: 'Accounting',
            path: '/accounting',
            icon: <Calculator size={20} />,
            children: [
                { label: 'Dashboard', path: '/accounting/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Invoices', path: '/accounting/invoices', icon: <Receipt size={18} /> },
                { label: 'Chart of Accounts', path: '/accounting/chart-of-accounts', icon: <FileText size={18} /> },
                { label: 'Journal Entries', path: '/accounting/journal-entries', icon: <FileCheck size={18} /> },
                { label: 'Accounts Payable', path: '/accounting/accounts-payable', icon: <DollarSign size={18} /> },
                { label: 'Financial Reports', path: '/accounting/reports', icon: <BarChart3 size={18} /> },
            ],
        },
        {
            label: 'HR',
            path: '/hr',
            icon: <UserCog size={20} />,
            children: [
                { label: 'Dashboard', path: '/hr', icon: <LayoutDashboard size={18} /> },
                { label: 'Modules', path: '/hr/modules', icon: <Settings2 size={18} /> },
                { label: 'Employees', path: '/hr/employees', icon: <Users size={18} /> },
                { label: 'Payroll', path: '/hr/payroll', icon: <CreditCard size={18} /> },
                { label: 'Recruitment', path: '/hr/recruitment', icon: <UserPlus size={18} /> },
                { label: 'Attendance', path: '/hr/attendance', icon: <Clock size={18} /> },
                { label: 'Leave Management', path: '/hr/leave', icon: <Calendar size={18} /> },
                { label: 'Onboarding', path: '/hr/onboarding', icon: <UserPlus size={18} /> },
                { label: 'Offboarding', path: '/hr/offboarding', icon: <UserMinus size={18} /> },
                { label: 'Policies', path: '/hr/policies', icon: <Shield size={18} /> },
                { label: 'Appraisals', path: '/hr/appraisals', icon: <BarChart3 size={18} /> },
                { label: 'LMS', path: '/hr/lms', icon: <GraduationCap size={18} /> },
            ],
        },
        {
            label: 'Manufacturing',
            path: '/manufacturing',
            icon: <Factory size={20} />,
            children: [
                { label: 'Dashboard', path: '/manufacturing/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Orders', path: '/manufacturing/orders', icon: <Factory size={18} /> },
                { label: 'BOM', path: '/manufacturing/bom', icon: <Layers size={18} /> },
                { label: 'Routing', path: '/manufacturing/routing', icon: <Settings2 size={18} /> },
                { label: 'Work Orders', path: '/manufacturing/work-orders', icon: <Wrench size={18} /> },
                { label: 'Quality', path: '/manufacturing/quality', icon: <ClipboardCheck size={18} /> },
                { label: 'Costing', path: '/manufacturing/costing', icon: <DollarSign size={18} /> },
            ],
        },
        {
            label: 'Marketing',
            path: '/marketing',
            icon: <Megaphone size={20} />,
            children: [
                { label: 'Dashboard', path: '/marketing/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Campaigns', path: '/marketing/campaigns', icon: <Mail size={18} /> },
            ],
        },
        {
            label: 'POS',
            path: '/pos',
            icon: <ShoppingCart size={20} />,
            children: [
                { label: 'Dashboard', path: '/pos/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'POS Interface', path: '/pos', icon: <ShoppingCart size={18} /> },
                { label: 'Sessions', path: '/pos/sessions', icon: <Clock size={18} /> },
                { label: 'Terminals', path: '/pos/terminals', icon: <Settings2 size={18} /> },
            ],
        },
        {
            label: 'Support',
            path: '/support',
            icon: <Headphones size={20} />,
            children: [
                { label: 'Dashboard', path: '/support/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Tickets', path: '/support/tickets', icon: <Headphones size={18} /> },
                { label: 'Agent Workbench', path: '/support/workbench', icon: <Users size={18} /> },
                { label: 'Knowledge Base', path: '/support/knowledge-base', icon: <FileText size={18} /> },
                { label: 'Surveys', path: '/support/surveys', icon: <BarChart3 size={18} /> },
                { label: 'ITSM', path: '/support/itsm', icon: <AlertCircle size={18} /> },
                { label: 'Automation', path: '/support/automation', icon: <Zap size={18} /> },
                { label: 'Reports', path: '/support/reports', icon: <BarChart3 size={18} /> },
                { label: 'Customer Portal', path: '/portal', icon: <Users size={18} /> },
            ],
        },
        {
            label: 'Projects',
            path: '/projects',
            icon: <FolderKanban size={20} />,
            children: [
                { label: 'Dashboard', path: '/projects/dashboard', icon: <LayoutDashboard size={18} /> },
                { label: 'Projects List', path: '/projects', icon: <FolderKanban size={18} /> },
            ],
        },
        {
            label: 'E-Signature',
            path: '/esignature',
            icon: <PenTool size={20} />,
        },
        {
            label: 'Admin Portal',
            path: '/admin',
            icon: <Shield size={20} />,
            children: [
                { label: 'Admin Portal', path: '/admin', icon: <Shield size={18} /> },
                { label: 'Roles', path: '/admin/roles', icon: <Users size={18} /> },
                { label: 'Permissions', path: '/admin/permissions', icon: <Shield size={18} /> },
                { label: 'Users', path: '/admin/users', icon: <Users size={18} /> },
                { label: 'Audit Logs', path: '/admin/audit', icon: <FileText size={18} /> },
            ],
        },
    ];

const getBottomItems = (): NavItem[] => [
        {
            label: 'Settings',
            path: '/settings',
            icon: <Settings size={20} />,
        },
        {
            label: 'Subscription',
            path: '/subscription',
            icon: <CreditCard size={20} />,
        },
    ];

export const Sidebar: React.FC<SidebarProps> = ({ onCollapseChange }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const location = useLocation();
    
    // Sidebar is expanded if not collapsed OR if hovered (when collapsed)
    const sidebarExpanded = !collapsed || isHovered;

    const navigationItems = useMemo(() => getNavigationItems(), []);
    const bottomItems = useMemo(() => getBottomItems(), []);

    useEffect(() => {
        // Auto-expand sections that contain the active route
        const activeSections: string[] = [];
        navigationItems.forEach(item => {
            if (item.children) {
                const isActive = item.children.some(child => 
                    location.pathname === child.path || location.pathname.startsWith(child.path + '/')
                );
                if (isActive) {
                    activeSections.push(item.label);
                }
            }
        });
        setExpandedSections(activeSections);
    }, [location.pathname, navigationItems]);

    useEffect(() => {
        onCollapseChange?.(collapsed && !isHovered);
    }, [collapsed, isHovered, onCollapseChange]);
    
    const handleMouseEnter = () => {
        if (collapsed) {
            setIsHovered(true);
        }
    };
    
    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const toggleSection = (label: string) => {
        setExpandedSections(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const isSectionExpanded = (label: string) => expandedSections.includes(label);
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
    const isSectionActive = (paths: string[]) =>
        paths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));

    const renderNavItem = (item: NavItem, isChild: boolean = false) => {
        const hasChildren = item.children && item.children.length > 0;
        const expanded = isSectionExpanded(item.label);
        const active = isActive(item.path);
        const sectionActive = hasChildren && isSectionActive(item.children!.map(c => c.path));

        if (hasChildren) {
            return (
                <div key={item.label} className="nav-section">
                    <button
                        className={`nav-item ${sectionActive ? 'active' : ''} ${isChild ? 'nav-child' : ''}`}
                        aria-expanded={expanded}
                        onClick={() => toggleSection(item.label)}
                    >
                        <div className="nav-item-content">
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarExpanded && <span className="nav-label">{item.label}</span>}
                        </div>
                        {sidebarExpanded && (
                            <span className="nav-expand-icon">
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                        )}
                    </button>
                    {expanded && sidebarExpanded && (
                        <div className="nav-children">
                            {item.children!.map(child => renderNavItem(child, true))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`nav-item ${active ? 'active' : ''} ${isChild ? 'nav-child' : ''}`}
            >
                <div className="nav-item-content">
                    <span className="nav-icon">{item.icon}</span>
                    {sidebarExpanded && <span className="nav-label">{item.label}</span>}
                </div>
            </Link>
        );
    };

    return (
        <aside 
            className={`sidebar ${collapsed ? 'collapsed' : ''} ${isHovered ? 'hover-expanded' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="sidebar-header" role="banner">
                <Link to="/dashboard" className="sidebar-brand">
                    <div className="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                            <circle cx="20" cy="20" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                            <circle cx="20" cy="20" r="4" fill="#FFFFFF" />
                        </svg>
                    </div>
                    {sidebarExpanded && <span className="brand-name">COHERON</span>}
                </Link>
                <button
                    className="collapse-btn"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav" aria-label="Main navigation">
                <div className="nav-main">
                    {navigationItems.map(item => renderNavItem(item))}
                </div>

                <div className="nav-bottom">
                    {bottomItems.map(item => renderNavItem(item))}
                </div>
            </nav>
        </aside>
    );
};
