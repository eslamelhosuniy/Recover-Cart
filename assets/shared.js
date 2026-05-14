// shared.js - Mobile menu toggle (works on all pages)
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    function toggleMenu() {
        sidebar?.classList.toggle('active');
        overlay?.classList.toggle('active');
        document.body.style.overflow = sidebar?.classList.contains('active') ? 'hidden' : '';
    }
    
    toggle?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', toggleMenu);
    
    // Close on nav link click (mobile)
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) toggleMenu();
        });
    });
    
    // Auto-close on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar?.classList.remove('active');
            overlay?.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Utility: Show/hide loading
const Loading = {
    show: () => document.getElementById('loading-overlay')?.classList.add('active'),
    hide: () => document.getElementById('loading-overlay')?.classList.remove('active')
};