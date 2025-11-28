import React from 'react';

/**
 * Example component showing how to import and use images
 * 
 * To use images:
 * 1. Place your image in src/assets/images/ folder
 * 2. Import it at the top of your component
 * 3. Use it in your JSX
 */

// Example imports (uncomment when you add images):
// import logoImage from '../assets/images/logo.png';
// import heroImage from '../assets/images/hero.jpg';
// import iconImage from '../assets/images/icon.svg';

export const ImageExample: React.FC = () => {
  return (
    <div>
      <h2>Image Import Examples</h2>
      
      {/* Method 1: Import from src/assets/images/ */}
      <div>
        <h3>Imported Image (Recommended)</h3>
        {/* Uncomment when you add an image:
        <img 
          src={logoImage} 
          alt="Logo" 
          style={{ width: '200px', height: 'auto' }}
        />
        */}
        <p>Place image in: <code>src/assets/images/logo.png</code></p>
        <p>Import: <code>import logoImage from '../assets/images/logo.png';</code></p>
      </div>

      {/* Method 2: Use from public folder */}
      <div>
        <h3>Public Folder Image</h3>
        {/* Uncomment when you add an image:
        <img 
          src="/images/logo.png" 
          alt="Logo" 
          style={{ width: '200px', height: 'auto' }}
        />
        */}
        <p>Place image in: <code>public/images/logo.png</code></p>
        <p>Use directly: <code>&lt;img src="/images/logo.png" /&gt;</code></p>
      </div>

      {/* Background Image Example */}
      <div>
        <h3>Background Image</h3>
        {/* Uncomment when you add an image:
        <div 
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '300px',
            borderRadius: '8px'
          }}
        />
        */}
        <p>Import and use in style: <code>backgroundImage: `url(${'heroImage'})`</code></p>
      </div>
    </div>
  );
};

