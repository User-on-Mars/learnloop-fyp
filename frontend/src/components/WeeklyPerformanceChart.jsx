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
    // Default data if none provided
    const defaultData = [
        { day: 'Mon', practice: 4, reflections: 2, blockers: 0 },
        { day: 'Tue', practice: 6, reflections: 3, blockers: 1 },
        { day: 'Wed', practice: 4.5, reflections: 2, blockers: 0 },
        { day: 'Thu', practice: 7, reflections: 0, blockers: 0 },
        { day: 'Fri', practice: 3, reflections: 4, blockers: 1 },
        { day: 'Sat', practice: 2, reflections: 1, blockers: 1 },
        { day: 'Sun', practice: 1, reflections: 0, blockers: 0 }
    ];

    const data = weeklyData.length > 0 ? weeklyData : defaultData;

    const primaryBar = '#2e5023';
    const secondaryBar = '#4f7942';
    const tertiaryBar = '#a3c99a';

    const chartData = {
        labels: data.map(d => d.day),
        datasets: [
            {
                label: 'Practice (hours)',
                data: data.map(d => d.practice),
                backgroundColor: primaryBar,
                borderRadius: 6,
                barThickness: 40
            },
            {
                label: 'Reflections',
                data: data.map(d => d.reflections),
                backgroundColor: secondaryBar,
                borderRadius: 6,
                barThickness: 40
            },
            {
                label: 'Blockers',
                data: data.map(d => d.blockers),
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
                backgroundColor: 'rgba(31, 41, 55, 0.9)', // Darker background
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
                                label += context.parsed.y + 'h';
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
                    stepSize: 2
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

    return (
        <div className="h-64 sm:h-80">
            <Bar data={chartData} options={options} />
        </div>
    );
}