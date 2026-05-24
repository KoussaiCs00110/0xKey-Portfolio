# Cybersecurity Student Portfolio Website

A modern, high-quality responsive personal website with a distinctive cyber-themed aesthetic featuring dark/light mode, particle effects, and smooth animations.

## 🎨 Features

- **Dual Theme System**: Dark mode (Red + Black) and Light mode (Blue + White) with localStorage persistence
- **Advanced Animations**: Particle system, glitch effects, progress bars, and scroll-triggered animations
- **Interactive Terminal Widget**: Draggable mini terminal with typing animation
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **Performance Optimized**: Respects `prefers-reduced-motion` and uses efficient animations
- **Modern Tech Stack**: Pure HTML, CSS, and JavaScript (no frameworks required)

## 📁 Files Included

- `index.html` - Main HTML structure
- `style.css` - Complete styling with dark/light themes
- `main.js` - All interactive functionality and animations
- `logo.svg` - Your animated logo
- `README.md` - This file

## 🚀 Quick Start

1. **Download all files** to a folder on your computer
2. **Replace placeholder content** (see Customization section below)
3. **Open `index.html`** in your web browser
4. **Optional**: Host on GitHub Pages, Netlify, or Vercel for free

## ✏️ Customization Guide

### 1. Personal Information (in `index.html`)

Search for "EDIT:" comments in the HTML file and replace:

```html
<!-- Line 59: Your Name -->
<h1 class="hero-title glitch" data-text="YOUR_NAME">YOUR_NAME</h1>

<!-- Line 97: GitHub URL -->
<a href="https://github.com/YOUR_USERNAME" target="_blank">

<!-- Line 125: Personal Bio -->
<p>I'm a passionate cybersecurity student...</p>

<!-- Line 225: LinkedIn URL -->
<a href="https://linkedin.com/in/YOUR_LINKEDIN" target="_blank">

<!-- Line 237: GitHub URL -->
<a href="https://github.com/YOUR_GITHUB" target="_blank">

<!-- Line 249: Telegram URL -->
<a href="https://t.me/YOUR_TELEGRAM" target="_blank">

<!-- Line 289: Telegram Button -->
<a href="https://t.me/YOUR_TELEGRAM" target="_blank">

<!-- Line 297: Email -->
<a href="mailto:your.email@example.com" class="btn btn-secondary">
```

### 2. Personal Photo

Replace the placeholder image URL on line 53:

```html
<!-- Current placeholder -->
<img src="https://via.placeholder.com/300x300/1a1a1f/ff2d2d?text=YOUR+PHOTO" alt="Profile Photo">

<!-- Replace with your photo -->
<img src="your-photo.jpg" alt="Profile Photo">
```

**Recommendation**: Use a 300x300px square photo for best results.

### 3. Skills & Stats (in `main.js`)

At the top of `main.js`, edit the CONFIG object:

```javascript
const CONFIG = {
    // Skills percentages (0-100)
    skills: {
        RE_PERCENT: 70,           // Reverse Engineering
        FORENSICS_PERCENT: 65,    // Digital Forensics
        WEB_PERCENT: 55           // Web Exploitation
    },
    
    // Stats for the About section
    stats: {
        ctfs: 25,           // Number of CTFs played
        projects: 15,       // Number of projects
        monthsLearning: 18  // Months of learning
    }
};
```

### 4. Logo Customization

The logo file (`logo.svg`) is already included. It will automatically:
- Glow on hover
- Rotate when clicked
- Pulse with animation
- Change color based on theme

To use a different logo:
1. Replace `logo.svg` with your own SVG file
2. Or update the `<img src="logo.svg">` in `index.html` to point to your logo

## 🎯 Key Sections

1. **Hero Section**: Introduction with photo, name, and CTAs
2. **About Section**: Personal bio and animated stats counters
3. **Skills Section**: Progress bars showing expertise levels
4. **Terminal Widget**: Interactive draggable terminal window
5. **Links Section**: Social media cards (LinkedIn, GitHub, Telegram)
6. **Contact Section**: Form with email integration

## 🎨 Theme Colors

### Dark Mode (Default)
- Background: `#0b0b0f`
- Accent: `#ff2d2d` (Red)
- Text: `#ffffff`

### Light Mode
- Background: `#f7fbff`
- Accent: `#2563eb` (Blue)
- Text: `#1a1a2e`

To change theme colors, edit CSS variables in `style.css`:

```css
:root {
    --accent-primary: #ff2d2d;  /* Change this for dark mode accent */
}

[data-theme="light"] {
    --accent-primary: #2563eb;  /* Change this for light mode accent */
}
```

## 🔧 Advanced Customization

### Modify Particle Count
In `main.js`, find the ParticleSystem class:

```javascript
this.particleCount = 80;  // Increase/decrease for more/fewer particles
```

### Adjust Animation Speed
In `style.css`, modify transition variables:

```css
--transition-fast: 0.2s ease;
--transition-normal: 0.3s ease;
--transition-slow: 0.5s ease;
```

### Terminal Commands
Edit terminal commands in `main.js`:

```javascript
terminalCommands: [
    { text: 'your-command', delay: 1000 },
    { text: 'output', delay: 2000, isOutput: true },
    // Add more commands...
]
```

## 📱 Mobile Responsiveness

The website automatically adjusts for:
- Desktop (1400px+)
- Tablet (768px - 1024px)
- Mobile (<768px)

Navigation collapses on mobile. Terminal widget becomes full-width on small screens.

## 🌐 Hosting Options

### GitHub Pages (Free)
1. Create a new repository
2. Upload all files
3. Go to Settings → Pages
4. Select main branch → Save
5. Your site will be live at `https://username.github.io/repo-name`

### Netlify (Free)
1. Sign up at netlify.com
2. Drag and drop your folder
3. Site deploys automatically

### Vercel (Free)
1. Sign up at vercel.com
2. Import your GitHub repo or upload files
3. Deploy with one click

## 🛠️ Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 📝 Contact Form Setup

The contact form currently uses `mailto:` as a fallback. To enable real form submissions:

1. **EmailJS**: Free service for client-side email
2. **Formspree**: Simple form backend
3. **Custom Backend**: Node.js/Express, PHP, or serverless function

Example with Formspree:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

## 🎓 Typography

The site uses two distinctive fonts:
- **Orbitron**: Headers and display text (cyber aesthetic)
- **JetBrains Mono**: Body text and code (developer-friendly)

Both fonts load from Google Fonts - no additional setup needed.

## ⚡ Performance Tips

- Images are lazy-loaded automatically
- Animations respect user's motion preferences
- Particles system is optimized for 60fps
- CSS transitions are hardware-accelerated

## 🐛 Troubleshooting

**Theme toggle not working?**
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`

**Animations not smooth?**
- Reduce particle count in `main.js`
- Check `prefers-reduced-motion` setting

**Logo not appearing?**
- Verify `logo.svg` is in the same folder
- Check browser console for 404 errors

## 📄 License

Free to use for personal portfolios. Modify as needed!

## 🤝 Credits

Design inspired by cybersecurity and hacker aesthetics with a modern twist.

---

**Need Help?** Check the comments in the code files - they explain what each section does!

Enjoy your new portfolio! 🚀
