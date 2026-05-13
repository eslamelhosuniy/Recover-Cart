document.addEventListener('DOMContentLoaded', function() {
    
    // Sidebar Toggle
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    // Simple toggle for mobile view (can be expanded for desktop collapse)
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Chart.js Default styling to match theme
    Chart.defaults.font.family = "'Cairo', sans-serif";
    Chart.defaults.color = '#6B7280';
    
    // 1. Line Chart (Abandoned vs Recovered)
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [
                {
                    label: 'السلات المهجورة',
                    data: [150, 180, 140, 210, 190, 230, 184],
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'مستردة',
                    data: [40, 55, 30, 60, 50, 70, 37],
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end' }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#E5E7EB' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Bar Chart (Messages Sent per day)
    const ctxBar = document.getElementById('barChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'رسائل واتساب مرسلة',
                data: [140, 175, 130, 200, 180, 210, 115],
                backgroundColor: '#3B82F6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#E5E7EB' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 3. Donut Chart (Message Status)
    const ctxDonut = document.getElementById('donutChart').getContext('2d');
    new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['تم الإرسال والنجاح', 'في الانتظار / قيد المعالجة', 'فشل الإرسال'],
            datasets: [{
                data: [85, 12, 3],
                backgroundColor: [
                    '#10B981', // Success
                    '#F59E0B', // Warning/Pending
                    '#EF4444'  // Error
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
});
