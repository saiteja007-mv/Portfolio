# Interactive Portfolio Website

A modern, responsive portfolio website built with HTML, CSS, and JavaScript featuring interactive elements and smooth animations.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Elements**: Smooth scrolling, animations, and hover effects
- **Modern UI**: Clean, professional design with gradient backgrounds
- **Contact Form**: Functional contact form with validation
- **Skills Visualization**: Animated skill bars and progress indicators
- **Project Showcase**: Interactive project cards with hover effects
- **Timeline**: Animated experience timeline
- **Statistics Counter**: Animated number counters in hero section

## File Structure

```
Portfolio/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and animations
├── script.js           # JavaScript functionality
├── README.md           # This file
└── DA Venkata sai teja.pdf  # Your resume
```

## Customization Guide

### 1. Personal Information

Update the following sections in `index.html`:

#### Hero Section (Lines 45-55)
```html
<h1 class="hero-title">
    Hi, I'm <span class="highlight">Your Name</span>
</h1>
<p class="hero-subtitle">Your Professional Title</p>
<p class="hero-description">
    Your professional summary or tagline.
</p>
```

#### Statistics (Lines 65-85)
Update the numbers in the `data-target` attributes:
```html
<span class="stat-number" data-target="5">0</span> <!-- Years Experience -->
<span class="stat-number" data-target="50">0</span> <!-- Projects Completed -->
<span class="stat-number" data-target="15">0</span> <!-- Happy Clients -->
```

### 2. About Section

Update the about section content (Lines 95-115):
```html
<p>
    Your personal description and background.
</p>
<p>
    Additional information about your expertise and interests.
</p>
```

### 3. Experience Timeline

Replace the experience items in the timeline section (Lines 130-180) with your actual work experience:

```html
<div class="timeline-item">
    <div class="timeline-marker"></div>
    <div class="timeline-content">
        <h3>Your Job Title</h3>
        <p class="company">Company Name</p>
        <p class="duration">2022 - Present</p>
        <ul>
            <li>Your achievement or responsibility</li>
            <li>Another achievement or responsibility</li>
        </ul>
    </div>
</div>
```

### 4. Projects Section

Update the project cards (Lines 200-280) with your actual projects:

```html
<div class="project-card">
    <div class="project-image">
        <i class="fas fa-chart-bar"></i> <!-- Change icon as needed -->
    </div>
    <div class="project-content">
        <h3>Project Name</h3>
        <p>Project description and technologies used.</p>
        <div class="project-tech">
            <span class="tech-tag">Technology 1</span>
            <span class="tech-tag">Technology 2</span>
        </div>
        <div class="project-links">
            <a href="project-url" class="project-link">View Project</a>
            <a href="github-url" class="project-link">GitHub</a>
        </div>
    </div>
</div>
```

### 5. Skills Section

Update your skills and proficiency levels (Lines 300-350):

```html
<div class="skill-item">
    <span class="skill-name">Skill Name</span>
    <div class="skill-bar">
        <div class="skill-progress" data-width="90"></div> <!-- Percentage (0-100) -->
    </div>
</div>
```

### 6. Contact Information

Update contact details (Lines 380-400):

```html
<div class="contact-item">
    <i class="fas fa-envelope"></i>
    <span>your.email@example.com</span>
</div>
<div class="contact-item">
    <i class="fas fa-phone"></i>
    <span>+1 (555) 123-4567</span>
</div>
<div class="contact-item">
    <i class="fas fa-map-marker-alt"></i>
    <span>Your Location</span>
</div>
```

### 7. Social Media Links

Update social media links (Lines 405-415):

```html
<div class="social-links">
    <a href="linkedin-url" class="social-link"><i class="fab fa-linkedin"></i></a>
    <a href="github-url" class="social-link"><i class="fab fa-github"></i></a>
    <a href="twitter-url" class="social-link"><i class="fab fa-twitter"></i></a>
</div>
```

## Color Scheme

The current color scheme uses:
- Primary Blue: `#2563eb`
- Secondary Purple: `#7c3aed`
- Accent Yellow: `#fbbf24`
- Text Dark: `#1f2937`
- Text Light: `#6b7280`

To change colors, update the CSS variables in `styles.css` or modify the specific color values.

## Fonts

The website uses Inter font from Google Fonts. To change fonts:

1. Update the Google Fonts link in `index.html`
2. Modify the `font-family` property in `styles.css`

## Icons

The website uses Font Awesome icons. Available icons can be found at [Font Awesome](https://fontawesome.com/icons).

## Deployment

### GitHub Pages
1. Create a GitHub repository
2. Upload all files to the repository
3. Go to Settings > Pages
4. Select source branch (usually `main`)
5. Your site will be available at `https://username.github.io/repository-name`

### Netlify
1. Drag and drop the folder to [Netlify](https://netlify.com)
2. Your site will be deployed instantly

### Vercel
1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Deploy automatically on every push

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Tips

1. Optimize images before adding them
2. Compress CSS and JavaScript files for production
3. Use a CDN for external libraries
4. Enable gzip compression on your server

## Customization Tips

1. **Add Your Photo**: Replace the placeholder icon in the hero section with your actual photo
2. **Custom Animations**: Modify the CSS animations in `styles.css`
3. **Additional Sections**: Add new sections by following the existing pattern
4. **Blog Integration**: Add a blog section with your articles
5. **Portfolio Gallery**: Create a dedicated gallery for your work samples

## Support

If you need help customizing the portfolio:
1. Check the HTML structure for the section you want to modify
2. Update the corresponding CSS styles
3. Test on different devices and browsers
4. Validate your HTML and CSS

## License

This portfolio template is free to use and modify for personal and commercial projects.

---

**Note**: Remember to replace all placeholder content with your actual information from your resume. The contact form currently shows a success message but doesn't actually send emails - you'll need to integrate it with a backend service or email service like Formspree, Netlify Forms, or your own server. 