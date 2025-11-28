# Image Import Guide for CoheronWorks ERP

## Two Methods to Use Images

### Method 1: Import from `src/assets/` (Recommended for most cases)

**Location:** Place images in `src/assets/images/` folder

**How to use:**
```typescript
import logoImage from '../assets/images/logo.png';
import heroImage from '../assets/images/hero.jpg';

// In your component:
<img src={logoImage} alt="Logo" />
<div style={{ backgroundImage: `url(${heroImage})` }} />
```

**Benefits:**
- Vite processes and optimizes images
- Gets a hashed filename for cache busting
- TypeScript support
- Images are bundled with your code

### Method 2: Use `public/` folder (For static assets)

**Location:** Place images in `public/images/` folder

**How to use:**
```typescript
// Direct path reference (no import needed)
<img src="/images/logo.png" alt="Logo" />
<div style={{ backgroundImage: 'url(/images/hero.jpg)' }} />
```

**Benefits:**
- No import needed
- Good for large files or assets that don't change often
- Direct URL access

## Recommended Folder Structure

```
coheron-works-web/
├── src/
│   └── assets/
│       ├── images/          ← Place your images here
│       │   ├── logos/
│       │   ├── icons/
│       │   ├── hero/
│       │   └── ...
│       └── react.svg
└── public/
    └── images/              ← Or here for static assets
        └── favicon.ico
```

## Example Usage in Components

### Example 1: Logo in Navbar
```typescript
import logo from '../assets/images/logo.png';

<img src={logo} alt="CoheronWorks Logo" />
```

### Example 2: Background Image
```typescript
import heroBg from '../assets/images/hero-background.jpg';

<div style={{ 
  backgroundImage: `url(${heroBg})`,
  backgroundSize: 'cover'
}}>
  Content here
</div>
```

### Example 3: Multiple Images
```typescript
import logo from '../assets/images/logo.png';
import icon from '../assets/images/icon.svg';
import banner from '../assets/images/banner.jpg';

// Use them in your JSX
```

## Supported Image Formats

- `.png`
- `.jpg` / `.jpeg`
- `.svg`
- `.gif`
- `.webp`
- `.avif`

## Tips

1. **For logos/icons:** Use `src/assets/images/` with imports
2. **For large hero images:** Can use either method
3. **For favicons:** Use `public/` folder
4. **For dynamic images:** Use `public/` with direct paths

