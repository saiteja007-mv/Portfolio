// DOM Elements
const cursorFollower = document.querySelector('.cursor-follower');
const loadingScreen = document.querySelector('.loading-screen');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');
const skillBars = document.querySelectorAll('.skill-progress');
const statNumbers = document.querySelectorAll('.stat-number');
const contactForm = document.querySelector('.contact-form');

// Loading Screen - Reduced delay for better UX
window.addEventListener('load', () => {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        document.body.style.overflow = 'visible';
    }, 800);  // Reduced from 2000ms to 800ms
});

// Custom Cursor
document.addEventListener('mousemove', (e) => {
    if (cursorFollower) {
        cursorFollower.style.left = e.clientX + 'px';
        cursorFollower.style.top = e.clientY + 'px';
    }
});

// Mobile Menu Toggle with scroll lock and guards
if (navToggle && navMenu) {
    const toggleMenu = () => {
        const isActive = !navMenu.classList.contains('active');
        navToggle.classList.toggle('active', isActive);
        navMenu.classList.toggle('active', isActive);
        // Lock body scroll when menu is open on small screens
        document.body.style.overflow = isActive ? 'hidden' : 'visible';
    };

    navToggle.addEventListener('click', toggleMenu);

    // Close menu and restore scroll on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.style.overflow = 'visible';
        }
    });
}

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navToggle && navMenu) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = 'visible';
        }
    });
});

// Smooth scrolling for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Throttle function for better performance
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) return;
        lastCall = now;
        return func(...args);
    };
}

// Navbar background change on scroll - Throttled for performance
window.addEventListener('scroll', throttle(() => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(15, 15, 35, 0.95)';
        navbar.style.backdropFilter = 'blur(20px)';
    } else {
        navbar.style.background = 'rgba(15, 15, 35, 0.8)';
        navbar.style.backdropFilter = 'blur(20px)';
    }
}, 100));

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    // Add animation classes to elements
    const animateElements = document.querySelectorAll('.about-content, .timeline-item, .work-card, .skills-category, .highlight-card');
    animateElements.forEach((el, index) => {
        if (index % 2 === 0) {
            el.classList.add('slide-in-left');
        } else {
            el.classList.add('slide-in-right');
        }
        observer.observe(el);
    });

    // Add fade-in animation to other elements
    const fadeElements = document.querySelectorAll('.section-header, .contact-content, .hero-content, .hero-visual');
    fadeElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Animate floating cards
    const floatingCards = document.querySelectorAll('.floating-card');
    floatingCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 2}s`;
    });
});

// Animate skill bars when they come into view
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const skillBar = entry.target;
            const width = skillBar.getAttribute('data-width');
            skillBar.style.width = width + '%';
        }
    });
}, { threshold: 0.5 });

skillBars.forEach(bar => {
    skillObserver.observe(bar);
});

// Animate statistics numbers
const animateNumbers = () => {
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const updateNumber = () => {
            current += increment;
            if (current < target) {
                stat.textContent = Math.floor(current);
                requestAnimationFrame(updateNumber);
            } else {
                stat.textContent = target;
            }
        };

        updateNumber();
    });
};

// Trigger number animation when hero section is in view
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNumbers();
            heroObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroSection = document.querySelector('.hero');
if (heroSection) {
    heroObserver.observe(heroSection);
}

// Contact form handling with AWS Lambda
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const btnIcon = document.getElementById('btnIcon');
        const formStatus = document.getElementById('formStatus');

        // Get form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            message: document.getElementById('message').value.trim()
        };

        // Basic validation
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            showFormStatus('Please fill in all fields', 'error');
            return;
        }

        if (!isValidEmail(formData.email)) {
            showFormStatus('Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        if (btnText) btnText.textContent = 'Sending...';
        if (btnIcon) btnIcon.className = 'fas fa-spinner fa-spin';
        if (formStatus) formStatus.style.display = 'none';

        try {
            // Call AWS API Gateway endpoint
            const response = await fetch('https://6dh439dgoj.execute-api.us-east-1.amazonaws.com/prod/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            // Check if response is OK
            if (!response.ok) {
                // Try to parse error response
                let errorMessage = 'Internal server error';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || `Server error (${response.status})`;
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    message: errorMessage
                });
                
                showFormStatus(`Error: ${errorMessage}. Please check the troubleshooting guide or try again later.`, 'error');
                return;
            }

            const result = await response.json();

            if (result.success) {
                showFormStatus(result.message || 'Message sent successfully! I\'ll get back to you soon.', 'success');
                contactForm.reset();
            } else {
                showFormStatus(result.message || 'Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            
            // More detailed error messages
            let errorMessage = 'Network error. Please check your connection and try again.';
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check your internet connection.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            showFormStatus(errorMessage, 'error');
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
            if (btnText) btnText.textContent = 'Send Message';
            if (btnIcon) btnIcon.className = 'fas fa-paper-plane';
        }
    });
}

// Show form status message
function showFormStatus(message, type) {
    const formStatus = document.getElementById('formStatus');
    if (!formStatus) return;

    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    formStatus.style.display = 'block';

    // Auto-hide after 5 seconds for success
    if (type === 'success') {
        setTimeout(() => {
            formStatus.style.display = 'none';
        }, 5000);
    }
}

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add styles
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Parallax effect for hero section (disabled on small screens)
const applyParallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const onScroll = () => {
        if (window.innerWidth <= 768) {
            hero.style.transform = '';
            return;
        }
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    };
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
};
applyParallax();

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.title-name');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 50);
        }, 500);
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Smooth reveal animation for sections - Throttled for performance
const revealSections = () => {
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (sectionTop < windowHeight * 0.75) {
            section.classList.add('revealed');
        }
    });
};

window.addEventListener('scroll', throttle(revealSections, 100));

// Add CSS for revealed sections
const style = document.createElement('style');
style.textContent = `
    section {
        opacity: 0;
        transform: translateY(50px);
        transition: all 0.8s ease;
    }
    
    section.revealed {
        opacity: 1;
        transform: translateY(0);
    }
    
    .loaded {
        opacity: 1;
    }
    
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Initialize reveal on load
document.addEventListener('DOMContentLoaded', () => {
    revealSections();
});

// Add hover effects for work cards
document.addEventListener('DOMContentLoaded', () => {
    const workCards = document.querySelectorAll('.work-card');
    
    workCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Add scroll progress indicator
const createScrollProgress = () => {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        z-index: 10001;
        transition: width 0.1s ease;
    `;
    
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
};

createScrollProgress();

// Add particle animation
const createParticles = () => {
    const particlesContainer = document.querySelector('.hero-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: #6366f1;
            border-radius: 50%;
            animation: float ${3 + Math.random() * 3}s ease-in-out infinite;
            animation-delay: ${Math.random() * 3}s;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
        `;
        particlesContainer.appendChild(particle);
    }
};

document.addEventListener('DOMContentLoaded', createParticles);

// Add code typing effect
const typeCode = () => {
    const codeLines = document.querySelectorAll('.code-line');
    codeLines.forEach((line, index) => {
        const originalText = line.innerHTML;
        line.innerHTML = '';
        line.style.opacity = '0';
        
        setTimeout(() => {
            line.style.opacity = '1';
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < originalText.length) {
                    line.innerHTML += originalText.charAt(i);
                    i++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 50);
        }, index * 500);
    });
};

// Initialize code typing when hero section is visible
const codeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            typeCode();
            codeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroCard = document.querySelector('.hero-card');
if (heroCard) {
    codeObserver.observe(heroCard);
}

// Add magnetic effect to buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
        });
    });
});

// Add tilt effect to cards
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.work-card, .highlight-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
});

// Profile image 3D tilt effect
document.addEventListener('DOMContentLoaded', () => {
    const tiltContainer = document.getElementById('profile-tilt');
    if (!tiltContainer) return;

    const image = tiltContainer.querySelector('.profile-image');
    const glare = tiltContainer.querySelector('.tilt-glare');

    const maxRotate = 10; // degrees
    const maxTranslateZ = 24; // px

    function handleMove(e) {
        const rect = tiltContainer.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
        if (clientX == null || clientY == null) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const px = (x / rect.width) - 0.5; // -0.5..0.5
        const py = (y / rect.height) - 0.5;

        const rotateY = (-px) * maxRotate;
        const rotateX = (py) * maxRotate;

        image.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${maxTranslateZ}px)`;

        if (glare) {
            const angle = Math.atan2(py, px) * (180 / Math.PI) + 90;
            const dist = Math.min(1, Math.sqrt(px*px + py*py) * 2);
            glare.style.opacity = 0.3 * dist;
            glare.style.transform = `rotate(${angle}deg)`;
        }
    }

    function resetTilt() {
        image.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        if (glare) glare.style.opacity = 0;
    }

    tiltContainer.addEventListener('mousemove', handleMove);
    tiltContainer.addEventListener('mouseleave', resetTilt);
    tiltContainer.addEventListener('touchmove', handleMove, { passive: true });
    tiltContainer.addEventListener('touchend', resetTilt);
});

// Add smooth reveal for timeline items
const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }, index * 200);
        }
    });
}, { threshold: 0.3 });

document.addEventListener('DOMContentLoaded', () => {
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-50px)';
        item.style.transition = 'all 0.6s ease';
        timelineObserver.observe(item);
    });
});

// Add glow effect on scroll - Throttled for performance
window.addEventListener('scroll', throttle(() => {
    const scrolled = window.pageYOffset;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollProgress = scrolled / maxScroll;

    document.documentElement.style.setProperty('--scroll-progress', scrollProgress);
}, 100));

// Add CSS for scroll-based effects
const scrollStyle = document.createElement('style');
scrollStyle.textContent = `
    :root {
        --scroll-progress: 0;
    }
    
    .hero::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
        opacity: var(--scroll-progress);
        pointer-events: none;
    }
`;
document.head.appendChild(scrollStyle);

// Chart Animation Functions
const createRetentionChart = () => {
    const canvas = document.getElementById('retention-chart');
    if (!canvas) {
        console.log('Retention chart canvas not found');
        return;
    }
    console.log('Creating retention chart');
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart data
    const data = [65, 78, 82, 75, 88, 92, 85];
    const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3'];
    const maxValue = Math.max(...data);
    
    // Chart dimensions
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw line chart
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - (value / maxValue) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#6366f1';
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - (value / maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Add glow effect
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
};

const createPerformanceChart = () => {
    const canvas = document.getElementById('performance-chart');
    if (!canvas) {
        console.log('Performance chart canvas not found');
        return;
    }
    console.log('Creating performance chart');
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart data
    const data = [
        { label: 'IT', value: 85 },
        { label: 'HR', value: 72 },
        { label: 'Sales', value: 68 },
        { label: 'Marketing', value: 91 }
    ];
    const maxValue = Math.max(...data.map(d => d.value));
    
    // Chart dimensions
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const barWidth = chartWidth / data.length * 0.6;
    const barSpacing = chartWidth / data.length * 0.4;
    
    // Draw bars
    data.forEach((item, index) => {
        const x = padding + (chartWidth / data.length) * index + barSpacing / 2;
        const barHeight = (item.value / maxValue) * chartHeight;
        const y = height - padding - barHeight;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#6366f1');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Add glow effect
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
        
        // Draw value label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(item.value + '%', x + barWidth / 2, y - 5);
        
        // Draw department label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Inter';
        ctx.fillText(item.label, x + barWidth / 2, height - padding + 15);
    });
};

// Animate charts when they come into view
const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Animate charts with delay
            setTimeout(() => createRetentionChart(), 500);
            setTimeout(() => createPerformanceChart(), 1000);
            chartObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

// Observe the hero card for chart animation
document.addEventListener('DOMContentLoaded', () => {
    const heroCard = document.getElementById('hero-card-3d');
    if (heroCard) {
        chartObserver.observe(heroCard);
        
        // Add flip card functionality
        let isFlipped = false;
        
        heroCard.addEventListener('mouseenter', () => {
            console.log('Card hovered - flipping to back');
            isFlipped = true;
            // Draw charts when card is flipped
            setTimeout(() => {
                createRetentionChart();
                createPerformanceChart();
            }, 400); // Half of the flip animation duration
        });
        
        heroCard.addEventListener('mouseleave', () => {
            isFlipped = false;
        });
        
        // Add touch support for mobile
        heroCard.addEventListener('touchstart', () => {
            if (!isFlipped) {
                heroCard.style.transform = 'rotateY(180deg)';
                isFlipped = true;
                setTimeout(() => {
                    createRetentionChart();
                    createPerformanceChart();
                }, 400);
            } else {
                heroCard.style.transform = 'rotateY(0deg)';
                isFlipped = false;
            }
        });
    }
});

// --- Dynamic SVG Chart for Flip Card ---
function renderDynamicChart(data) {
  const svg = document.getElementById('interactive-chart');
  if (!svg) return;

  // Clear previous content
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Chart dimensions
  const width = 320, height = 160, paddingX = 30, paddingY = 20;
  const chartW = width - 2 * paddingX, chartH = height - 2 * paddingY;
  const n = data.length;

  // Find min/max for scaling
  const minY = Math.min(...data);
  const maxY = Math.max(...data);

  // Map data to SVG points
  const points = data.map((v, i) => {
    const x = paddingX + (chartW / (n - 1)) * i;
    // Invert y for SVG (higher value = lower y)
    const y = paddingY + chartH - ((v - minY) / (maxY - minY + 1e-6)) * chartH;
    return { x, y, v };
  });

  // Area fill polygon
  let areaPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  areaPoints += ` ${points[n-1].x},${height-paddingY} ${points[0].x},${height-paddingY}`;
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  area.setAttribute('points', areaPoints);
  area.setAttribute('fill', '#6366f1');
  area.setAttribute('opacity', '0.12');
  svg.appendChild(area);

  // Line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#6366f1');
  line.setAttribute('stroke-width', '4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(line);

  // Points
  points.forEach(p => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'chart-point');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', 7);
    c.setAttribute('fill', '#6366f1');
    c.setAttribute('data-value', p.v);
    svg.appendChild(c);
  });
}

// Initial data
const chartData = [20, 60, 50, 90, 70, 95];

document.addEventListener('DOMContentLoaded', function() {
  renderDynamicChart(chartData);

  const svg = document.getElementById('interactive-chart');
  const tooltip = document.getElementById('chart-tooltip');
  if (svg && tooltip) {
    svg.addEventListener('mousemove', function(e) {
      // Delegate to points
      if (e.target.classList.contains('chart-point')) {
        tooltip.textContent = 'Value: ' + e.target.getAttribute('data-value');
        tooltip.style.display = 'block';
        const rect = svg.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 40) + 'px';
      } else {
        tooltip.style.display = 'none';
      }
    });
    svg.addEventListener('mouseleave', function() {
      tooltip.style.display = 'none';
    });
  }
});

// Shake Cursor Detection for Resume
let mousePositions = [];
let shakeDetected = false;
let shakeEnabled = false;
const SHAKE_THRESHOLD = 800; // Minimum total pixels traveled (increased)
const SHAKE_DIRECTION_CHANGES = 10; // Number of direction changes required (increased)
const SHAKE_TIME = 500; // Time window in milliseconds
const MIN_SPEED = 2500; // Minimum pixels per second (increased)

// Enable shake detection after 3 seconds to avoid false triggers on page load
setTimeout(() => {
    shakeEnabled = true;
    console.log('Shake detection enabled. Shake your cursor vigorously to view resume!');
}, 3000);

function detectShake(currentX, currentY) {
    const now = Date.now();
    
    // Add current position
    mousePositions.push({ x: currentX, y: currentY, time: now });
    
    // Remove positions older than SHAKE_TIME
    mousePositions = mousePositions.filter(pos => now - pos.time < SHAKE_TIME);
    
    // Need at least 8 positions to detect shake
    if (mousePositions.length < 8) return false;
    
    // Calculate total distance and direction changes
    let totalDistance = 0;
    let directionChanges = 0;
    let prevDirectionX = 0;
    let prevDirectionY = 0;
    
    for (let i = 1; i < mousePositions.length; i++) {
        const dx = mousePositions[i].x - mousePositions[i-1].x;
        const dy = mousePositions[i].y - mousePositions[i-1].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
        
        // Check for direction change (back and forth movement)
        const currentDirectionX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        const currentDirectionY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        
        if (prevDirectionX !== 0 && currentDirectionX !== 0 && prevDirectionX !== currentDirectionX) {
            directionChanges++;
        }
        if (prevDirectionY !== 0 && currentDirectionY !== 0 && prevDirectionY !== currentDirectionY) {
            directionChanges++;
        }
        
        prevDirectionX = currentDirectionX;
        prevDirectionY = currentDirectionY;
    }
    
    // Calculate speed (pixels per second)
    const timeElapsed = (now - mousePositions[0].time) / 1000; // Convert to seconds
    const speed = totalDistance / timeElapsed;
    
    // Must have:
    // 1. Sufficient total distance traveled
    // 2. Rapid direction changes (back and forth)
    // 3. High speed movement
    return totalDistance > SHAKE_THRESHOLD && 
           directionChanges >= SHAKE_DIRECTION_CHANGES && 
           speed > MIN_SPEED;
}

document.addEventListener('mousemove', (e) => {
    // Only detect shake if enabled (after page load delay)
    if (!shakeEnabled || shakeDetected) return;
    
    if (detectShake(e.clientX, e.clientY)) {
        console.log('Shake detected! Opening resume...');
        shakeDetected = true;
        openResumeModal();
        
        // Reset after 3 seconds to allow re-triggering
        setTimeout(() => {
            shakeDetected = false;
            mousePositions = [];
        }, 3000);
    }
});

// Resume Modal Functions
function openResumeModal() {
    const modal = document.getElementById('resume-modal');
    const iframe = document.getElementById('resume-iframe');
    
    if (modal && iframe) {
        // Use absolute path for better compatibility
        const resumePath = window.location.origin + '/docs/Venkata%20Sai%20Teja%20Mothukuri.pdf';
        iframe.src = resumePath;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Hide notification when resume opens
        const notification = document.getElementById('shake-notification');
        if (notification) {
            notification.classList.add('hide');
        }
        
        // Fallback: If iframe fails to load, open in new tab
        iframe.onerror = function() {
            window.open(resumePath, '_blank');
            closeResumeModal();
        };
    }
}

function closeResumeModal() {
    const modal = document.getElementById('resume-modal');
    const iframe = document.getElementById('resume-iframe');
    
    if (modal && iframe) {
        modal.classList.remove('active');
        iframe.src = '';
        document.body.style.overflow = 'visible';
    }
}

// Close modal when clicking outside
document.getElementById('resume-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'resume-modal') {
        closeResumeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResumeModal();
    }
});

// Notification Functions
function closeShakeNotification() {
    const notification = document.getElementById('shake-notification');
    if (notification) {
        notification.classList.add('hide');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }
}

// Auto-hide notification after 10 seconds
setTimeout(() => {
    closeShakeNotification();
}, 10000);

