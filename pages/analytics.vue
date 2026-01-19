<template>
    <div>
        <h1>Analytics Summary</h1>
        <div style="display: flex; align-items: center; margin-bottom: 1em;">
            <button @click="prevYear">&#8592;</button>
            <span style="margin: 0 1em; font-weight: bold;">{{ selectedYear }}</span>
            <button @click="nextYear">&#8594;</button>
        </div>
        <canvas ref="chart" width="800" height="300" style="margin-bottom:2em;"></canvas>
        <div v-if="Array.isArray(analytics) && analytics.length">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Unique Users</th>
                        <th>Pages Viewed</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(summary, day) in summarizedAnalytics" :key="day">
                        <td>{{ day }}</td>
                        <td>{{ summary.uniqueUsers }}</td>
                        <td>{{ summary.pagesViewed }}</td>
                    </tr>
                </tbody>
            </table>
            <h2>Page View Counts</h2>
            <table>
                <thead>
                    <tr>
                        <th>Views</th>
                        <th>Page</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in pageViewCounts" :key="item.page">
                        <td>{{ item.count }}</td>
                        <td>{{ item.page }}</td>
                    </tr>
                </tbody>
            </table>
            <h2>Unique Referrers</h2>
            <table>
                <thead>
                    <tr>
                        <th>Referrer</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="ref in uniqueReferrers" :key="ref">
                        <td>{{ ref }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-else>
            <pre>{{ analytics }}</pre>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { API_BASE } from '@/helpers/api'
Chart.register(...registerables)

const analytics = ref([])
const chartInstance = ref(null)
const selectedYear = ref(null)
const chart = ref(null)

const yearsAvailable = computed(() => {
    if (!Array.isArray(analytics.value)) return [];
    const years = new Set();
    analytics.value.forEach(row => {
        const d = new Date(Number(row.date));
        if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort();
})

const summarizedAnalytics = computed(() => {
    if (!Array.isArray(analytics.value)) return {};
    const byDay = {};
    analytics.value.forEach(row => {
        const d = new Date(Number(row.date));
        if (isNaN(d.getTime())) return;
        const year = d.getFullYear();
        if (year !== selectedYear.value) return;
        const day = d.toISOString().slice(0, 10);
        if (!byDay[day]) {
            byDay[day] = { users: new Set(), pages: new Set() };
        }
        if (row.user) byDay[day].users.add(row.user);
        if (row.page) byDay[day].pages.add(row.page);
    });
    const summary = {};
    const start = new Date(`${selectedYear.value}-01-01T00:00:00Z`);
    const end = new Date(`${selectedYear.value}-12-31T00:00:00Z`);
    let cur = new Date(start);
    while (cur <= end) {
        const dayStr = cur.toISOString().slice(0, 10);
        summary[dayStr] = {
            uniqueUsers: byDay[dayStr] ? byDay[dayStr].users.size : 0,
            pagesViewed: byDay[dayStr] ? byDay[dayStr].pages.size : 0
        };
        cur.setDate(cur.getDate() + 1);
    }
    return summary;
})

const pageViewCounts = computed(() => {
    if (!Array.isArray(analytics.value)) return [];
    const counts = {};
    analytics.value.forEach(row => {
        if (row.page) {
            counts[row.page] = (counts[row.page] || 0) + 1;
        }
    });
    return Object.keys(counts)
        .map(page => ({ page, count: counts[page] }))
        .sort((a, b) => b.count - a.count);
})

const uniqueReferrers = computed(() => {
    if (!Array.isArray(analytics.value)) return [];
    const refSet = new Set();
    analytics.value.forEach(row => {
        if (
            row.referrer &&
            !row.referrer.startsWith('/') &&
            !row.referrer.startsWith('http://danielbeck.net')
        ) {
            refSet.add(row.referrer);
        }
    });
    return Array.from(refSet);
})

watch(analytics, () => {
    nextTick(drawChart);
})

watch(selectedYear, () => {
    nextTick(drawChart);
})

function prevYear() {
    const years = yearsAvailable.value;
    const idx = years.indexOf(selectedYear.value);
    if (idx > 0) selectedYear.value = years[idx - 1];
}

function nextYear() {
    const years = yearsAvailable.value;
    const idx = years.indexOf(selectedYear.value);
    if (idx < years.length - 1) selectedYear.value = years[idx + 1];
}

function drawChart() {
    if (!chart.value) return;
    const ctx = chart.value.getContext('2d');
    if (!ctx) return;
    const summary = summarizedAnalytics.value;
    const days = Object.keys(summary).sort();
    if (!days.length) return;
    const pageCounts = days.map(d => summary[d].pagesViewed);
    const userCounts = days.map(d => summary[d].uniqueUsers);
    if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
    }
    chartInstance.value = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Unique Users',
                    data: userCounts,
                    borderColor: '#FF4136',
                    backgroundColor: 'rgba(255,65,54,0.1)',
                    fill: false
                },
                {
                    label: 'Pages Viewed',
                    data: pageCounts,
                    borderColor: '#0074D9',
                    backgroundColor: 'rgba(0,116,217,0.1)',
                    fill: false
                }
            ]
        },
        options: {
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'category',
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        }
    });
}

onMounted(async () => {
    try {
        const response = await fetch(`${API_BASE}/analytics.php`);
        if (response.ok) {
            analytics.value = await response.json();
            window.analytics = analytics.value;
            const years = yearsAvailable.value;
            if (years.length) {
                selectedYear.value = years[years.length - 1];
            }
        } else {
            analytics.value = `Error: ${response.status}`;
        }
    } catch (e) {
        analytics.value = `Error: ${e}`;
    }
})

onBeforeUnmount(() => {
    if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
    }
})
</script>
