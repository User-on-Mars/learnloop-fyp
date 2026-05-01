import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function WeeklyPerformanceChart({ weeklyData = [], isLoading = false }) {
    // Filter out days with no activity
    const activeData = weeklyData.filter(d => d.practice > 0 || d.reflections > 0 || d.blockers > 0);

    const primaryBar = '#2e5023';
    const secondaryBar = '#4f7942';
    const tertiaryBar = '#a3c99a';

    // Detect mobile viewport for responsive configuration
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    const chartData = {
        labels: activeData.map(d => d.day),
        datasets: [
            {
                label: 'Practice (hours)',
                data: activeData.map(d => d.practice),
                backgroundColor: primaryBar,
                borderRadius: 6,
                // Remove fixed barThickness - let Chart.js calculate dynamically
            },
            {
                label: 'Reflections',
                data: activeData.map(d => d.reflections),
                backgroundColor: secondaryBar,
                borderRadius: 6,
                // Remove fixed barThickness - let Chart.js calculate dynamically
            },
            {
                label: 'Blockers',
                data: activeData.map(d => d.blockers),
                backgroundColor: tertiaryBar,
                borderRadius: 6,
                // Remove fixed barThickness - let Chart.js calculate dynamically
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    // Scale legend padding: smaller on mobile
                    padding: isMobile ? 10 : 15,
                    font: {
                        // Scale legend font size: 11px on mobile, 12px on desktop
                        size: isMobile ? 11 : 12,
                        family: "var(--font-body), system-ui, sans-serif"
                    },
                    color: '#475569',
                }
            },
            tooltip: {
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                // Scale tooltip padding: smaller on mobile
                padding: isMobile ? 10 : 12,
                titleFont: {
                    // Scale tooltip title font: 12px on mobile, 13px on desktop
                    size: isMobile ? 12 : 13,
                    weight: 'bold'
                },
                bodyFont: {
                    // Scale tooltip body font: 11px on mobile, 12px on desktop
                    size: isMobile ? 11 : 12
                },
                borderColor: '#2e5023',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            if (context.dataset.label === 'Practice (hours)') {
                                const hours = Math.floor(context.parsed.y);
                                const minutes = Math.round((context.parsed.y - hours) * 60);
                                if (hours > 0 && minutes > 0) {
                                    label += `${hours}h ${minutes}m`;
                                } else if (hours > 0) {
                                    label += `${hours}h`;
                                } else {
                                    label += `${minutes}m`;
                                }
                            } else {
                                label += context.parsed.y;
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        // Scale x-axis font: 11px on mobile, 12px on desktop
                        size: isMobile ? 11 : 12,
                        family: "var(--font-body), system-ui, sans-serif"
                    },
                    color: '#475569',
                    // Rotate x-axis labels 45° on mobile if needed
                    maxRotation: isMobile ? 45 : 0,
                    minRotation: isMobile ? 45 : 0
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#e2e8f0',
                    drawBorder: false
                },
                ticks: {
                    font: {
                        // Scale y-axis font: 11px on mobile, 12px on desktop
                        size: isMobile ? 11 : 12,
                        family: "var(--font-body), system-ui, sans-serif"
                    },
                    color: '#475569',
                    stepSize: 1,
                    callback: function(value) {
                        return value + 'h';
                    }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false
        }
    };

    if (isLoading) {
        return (
            <div className="h-48 sm:h-64 lg:h-80 flex items-center justify-center">
                <div className="animate-pulse text-site-accent/60 font-medium">
                    Loading chart data...
                </div>
            </div>
        );
    }

    // Show empty state if no data
    if (activeData.length === 0) {
        return (
            <div className="h-48 sm:h-64 lg:h-80 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-site-muted mb-2">No practice data this week</p>
                    <p className="text-xs text-site-faint">Start logging practice sessions to see your weekly performance</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-48 sm:h-64 lg:h-80">
            <Bar data={chartData} options={options} />
        </div>
    );
}