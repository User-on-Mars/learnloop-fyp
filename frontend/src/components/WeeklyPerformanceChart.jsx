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

    const chartData = {
        labels: activeData.map(d => d.day),
        datasets: [
            {
                label: 'Practice (hours)',
                data: activeData.map(d => d.practice),
                backgroundColor: primaryBar,
                borderRadius: 6,
                barThickness: 40
            },
            {
                label: 'Reflections',
                data: activeData.map(d => d.reflections),
                backgroundColor: secondaryBar,
                borderRadius: 6,
                barThickness: 40
            },
            {
                label: 'Blockers',
                data: activeData.map(d => d.blockers),
                backgroundColor: tertiaryBar,
                borderRadius: 6,
                barThickness: 40
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
                    padding: 15,
                    font: {
                        size: 12,
                        family: "var(--font-body), system-ui, sans-serif"
                    },
                    color: '#475569',
                }
            },
            tooltip: {
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                padding: 12,
                titleFont: {
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 12
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
                        size: 12,
                        family: "var(--font-body), system-ui, sans-serif"
                    },
                    color: '#475569'
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
                        size: 12,
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
            <div className="h-64 sm:h-80 flex items-center justify-center">
                <div className="animate-pulse text-site-accent/60 font-medium">
                    Loading chart data...
                </div>
            </div>
        );
    }

    // Show empty state if no data
    if (activeData.length === 0) {
        return (
            <div className="h-64 sm:h-80 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-site-muted mb-2">No practice data this week</p>
                    <p className="text-xs text-site-faint">Start logging practice sessions to see your weekly performance</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-64 sm:h-80">
            <Bar data={chartData} options={options} />
        </div>
    );
}