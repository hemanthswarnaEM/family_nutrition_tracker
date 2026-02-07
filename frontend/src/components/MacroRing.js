import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function MacroRing({ label, current, target, unit, color }) {
    const percent = target ? Math.round((current / target) * 100) : 0;
    const remaining = target ? Math.max(0, target - current) : 0;

    const data = {
        labels: ['Consumed', 'Remaining'],
        datasets: [
            {
                data: [current, remaining],
                backgroundColor: [color, '#e5e7eb'],
                borderWidth: 0,
                cutout: '75%', // Thinner ring
                circumference: 360,
                rotation: 0,
            },
        ],
    };

    const options = {
        plugins: {
            tooltip: { enabled: false }, // Disable tooltip for cleaner look
            legend: { display: false },
        },
        maintainAspectRatio: false,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
            <div style={{ position: 'relative', height: '100px', width: '100px' }}>
                <Doughnut data={data} options={options} />
                {/* Center Text */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>{Math.round(percent)}%</div>
                </div>
            </div>
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#4b5563' }}>{label}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{Math.round(current)} / {Math.round(target)}{unit}</div>
            </div>
        </div>
    );
}

export default MacroRing;
