import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

/**
 * Example: How to use an image logo instead of an icon
 * 
 * STEP 1: Place your logo image in src/assets/images/logo.png
 * STEP 2: Import it at the top
 * STEP 3: Replace the icon with <img> tag
 */

// Uncomment this line when you add your logo:
// import logoImage from '../assets/images/logo.png';

export const NavbarWithImage: React.FC = () => {

    return (
        <nav className="navbar glass-panel">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    {/* OPTION 1: Use imported image */}
                    {/* Uncomment when you add logo.png:
                    <img 
                        src={logoImage} 
                        alt="CoheronWorks Logo" 
                        style={{ 
                            width: '40px', 
                            height: '40px',
                            objectFit: 'contain'
                        }}
                    />
                    */}
                    
                    {/* OPTION 2: Use image from public folder */}
                    {/* Uncomment when you add logo to public/images/:
                    <img 
                        src="/images/logo.png" 
                        alt="CoheronWorks Logo" 
                        style={{ 
                            width: '40px', 
                            height: '40px',
                            objectFit: 'contain'
                        }}
                    />
                    */}
                    
                    {/* Current: Using icon (replace with image above) */}
                    <div className="logo-icon">
                        {/* Icon placeholder - replace with image */}
                    </div>
                    
                    <span className="brand-name">CoheronWorks</span>
                </Link>
            </div>
        </nav>
    );
};

