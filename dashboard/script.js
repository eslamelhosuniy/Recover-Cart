const API_BASE = 'http://localhost:8000/api/v1';

const kpiElements = {
    totalCarts: document.getElementById('kpi-total-carts'),
    recoveredCarts: document.getElementById('kpi-recovered-carts'),
    recoveryRate: document.getElementById('kpi-recovery-rate'),
    totalRevenue: document.getElementById('kpi-total-revenue')
};

const tableBody = document.querySelector('#carts-table tbody');
const loadingOverlay = document.getElementById('loading-overlay');
const refreshBtn = document.getElementById('refresh-btn');

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

async function fetchKPIs() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/kpis`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        kpiElements.totalCarts.textContent = data.total_carts;
        kpiElements.recoveredCarts.textContent = data.recovered_carts;
        kpiElements.recoveryRate.textContent = `${data.recovery_rate}%`;
        kpiElements.totalRevenue.textContent = `${data.total_revenue_recovered} ر.س`;
    } catch (error) {
        console.error("Error fetching KPIs:", error);
    }
}

async function fetchCarts() {
    try {
        const response = await fetch(`${API_BASE}/carts?limit=5`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        renderCartsTable(data.data);
    } catch (error) {
        console.error("Error fetching Carts:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">خطأ في تحميل البيانات</td></tr>';
    }
}

function renderCartsTable(carts) {
    if (!carts || carts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد سلات حالياً</td></tr>';
        return;
    }

    tableBody.innerHTML = carts.map(cart => {
        const date = new Date(cart.abandoned_at).toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const reminderStatus = cart.reminder_sent 
            ? '<span class="status-badge status-success">تم الإرسال</span>'
            : '<span class="status-badge status-pending">في الانتظار</span>';
            
        const recoveryStatus = cart.is_recovered 
            ? '<span class="status-badge status-success">مسترجعة</span>'
            : '<span class="status-badge status-pending">مهجورة</span>';

        return `
            <tr>
                <td>#${cart.salla_cart_id.substring(0, 8)}</td>
                <td>${cart.cart_value} ر.س</td>
                <td>${date}</td>
                <td>${reminderStatus}</td>
                <td>${recoveryStatus}</td>
            </tr>
        `;
    }).join('');
}

async function refreshDashboard() {
    showLoading();
    await Promise.all([fetchKPIs(), fetchCarts()]);
    setTimeout(hideLoading, 500);
}

refreshBtn.addEventListener('click', refreshDashboard);

document.addEventListener('DOMContentLoaded', () => {
    refreshDashboard();
});
