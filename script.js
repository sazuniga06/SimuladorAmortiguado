let chart;
let sPlaneChart;
let compareMode = false;

// UI Elements
const zetaInput = document.getElementById('zeta');
const wnInput = document.getElementById('wn');
const tmaxInput = document.getElementById('tmax');
const inputType = document.getElementById('input-type');

const zetaVal = document.getElementById('zeta-val');
const wnVal = document.getElementById('wn-val');
const tmaxVal = document.getElementById('tmax-val');

const typeLabel = document.getElementById('type-label');
const cardType = document.getElementById('card-type');
const tsVal = document.getElementById('ts-val');
const osVal = document.getElementById('os-val');
const wdVal = document.getElementById('wd-val');
const eqParams = document.getElementById('eq-params');
const mainSubtitle = document.getElementById('main-subtitle');
const btnExport = document.getElementById('btn-export');
const btnReplay = document.getElementById('btn-replay'); // New button

const presetBtns = document.querySelectorAll('.preset-btn');

// Animation state
const simCanvas = document.getElementById('sim-canvas');
let simCtx = null;
if (simCanvas) {
    simCtx = simCanvas.getContext('2d');
}
let animationId = null;
let animStartTime = 0;

// System Logic (Time Domain)
function stepResponse(zeta, wn, tArr) {
    return tArr.map(t => {
        if (t < 0) return 0;
        if (zeta < 1) {
            const wd = wn * Math.sqrt(1 - zeta * zeta);
            return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
        } else if (Math.abs(zeta - 1) < 0.001) {
            return 1 - Math.exp(-wn * t) * (1 + wn * t);
        } else {
            const r1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
            const r2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
            const A = r1 / (r1 - r2);
            const B = -r2 / (r1 - r2);
            return 1 - A * Math.exp(r2 * t) - B * Math.exp(r1 * t);
        }
    });
}

function impulseResponse(zeta, wn, tArr) {
    return tArr.map(t => {
        if (t < 0) return 0;
        if (zeta < 1) {
            const wd = wn * Math.sqrt(1 - zeta * zeta);
            return (wn / Math.sqrt(1 - zeta * zeta)) * Math.exp(-zeta * wn * t) * Math.sin(wd * t);
        } else if (Math.abs(zeta - 1) < 0.001) {
            return wn * wn * t * Math.exp(-wn * t);
        } else {
            const r1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
            const r2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
            return (wn / (2 * Math.sqrt(zeta * zeta - 1))) * (Math.exp(r1 * t) - Math.exp(r2 * t));
        }
    });
}

function getPoles(zeta, wn) {
    if (zeta < 1) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        return [{x: -zeta * wn, y: wd}, {x: -zeta * wn, y: -wd}];
    } else if (Math.abs(zeta - 1) < 0.001) {
        return [{x: -wn, y: 0}, {x: -wn, y: 0}];
    } else {
        const r1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
        const r2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
        return [{x: r1, y: 0}, {x: r2, y: 0}];
    }
}

function classifySystem(z) {
    if (z < 0.999) return { label: 'Subamortiguado', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
    if (z < 1.001) return { label: 'Críticamente Amortiguado', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
    return { label: 'Sobreamortiguado', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
}

function computeStepMetrics(zeta, wn, yArr, tArr) {
    const os = zeta < 1 ? (Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100) : 0;
    let ts = '—';
    for (let i = yArr.length - 1; i >= 0; i--) {
        if (Math.abs(yArr[i] - 1) > 0.02) {
            ts = tArr[Math.min(i + 1, tArr.length - 1)].toFixed(2);
            break;
        }
    }
    const wd = zeta < 1 ? (wn * Math.sqrt(1 - zeta * zeta)).toFixed(3) : '—';
    return { os: os.toFixed(1), ts, wd };
}

function makeTArr(tmax, n = 500) {
    return Array.from({ length: n }, (_, i) => (i * tmax) / (n - 1));
}

// Chart Renderers
function buildChart(datasets, labels) {
    const ctx = document.getElementById('chart');
    if (chart) chart.destroy();
    
    Chart.defaults.color = '#9CA3AF';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    // Custom plugin to ensure background is dark before exporting to base64
    const customCanvasBackgroundColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const {ctx} = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = options.color || '#151A22';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };

    chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                customCanvasBackgroundColor: { color: '#151A22' },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#F3F4F6',
                    bodyColor: '#D1D5DB',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: ctx => `${ctx.dataset.label || 'Valor'}: ${parseFloat(ctx.raw).toFixed(3)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Tiempo (s)', font: { size: 13, weight: 500 } },
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    border: { display: false },
                    ticks: { maxTicksLimit: 10, callback: v => v.toFixed(1) }
                },
                y: {
                    title: { display: true, text: 'Amplitud', font: { size: 13, weight: 500 } },
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    border: { display: false },
                    ticks: { callback: v => v.toFixed(2) }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            elements: { line: { borderJoinStyle: 'round' } }
        },
        plugins: [customCanvasBackgroundColor]
    });
}

function buildSPlaneChart(poles, clsColor) {
    const ctx = document.getElementById('s-plane-chart');
    if (sPlaneChart) sPlaneChart.destroy();
    
    let maxAbs = 0;
    poles.forEach(p => {
        if (Math.abs(p.x) > maxAbs) maxAbs = Math.abs(p.x);
        if (Math.abs(p.y) > maxAbs) maxAbs = Math.abs(p.y);
    });
    maxAbs = Math.max(maxAbs * 1.5, 2);

    sPlaneChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Polos',
                data: poles,
                backgroundColor: clsColor,
                borderColor: '#fff',
                borderWidth: 1.5,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointStyle: 'crossRot' // X mark
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `Polo: ${ctx.raw.x.toFixed(2)} ${ctx.raw.y >= 0 ? '+' : ''}${ctx.raw.y.toFixed(2)}j`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'center',
                    min: -maxAbs,
                    max: maxAbs/4,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    title: { display: true, text: 'Real (σ)', color: '#9CA3AF', font: {size: 11}, align: 'end' }
                },
                y: {
                    type: 'linear',
                    position: 'center',
                    min: -maxAbs,
                    max: maxAbs,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    title: { display: true, text: 'Imaginario (jω)', color: '#9CA3AF', font: {size: 11}, align: 'end' }
                }
            }
        }
    });
}

function renderLegend(items) {
    const el = document.getElementById('legend');
    el.innerHTML = items.map(i =>
        `<span class="leg-item"><span class="leg-dot" style="background:${i.color}; box-shadow: 0 0 8px ${i.color}80"></span>${i.label}</span>`
    ).join('');
}

// Update UI
function render() {
    const zeta = parseFloat(zetaInput.value);
    const wn = parseFloat(wnInput.value);
    const tmax = parseInt(tmaxInput.value);
    const inpType = inputType.value;
    const isStep = inpType === 'step';

    // Update Text Values
    zetaVal.textContent = zeta.toFixed(2);
    wnVal.textContent = wn.toFixed(1);
    tmaxVal.textContent = tmax;
    mainSubtitle.textContent = isStep ? 'Respuesta al escalón unitario' : 'Respuesta al impulso (Dirac)';

    const cls = classifySystem(zeta);
    typeLabel.textContent = cls.label;
    typeLabel.style.color = cls.color;
    cardType.style.borderColor = cls.border;

    const tArr = makeTArr(tmax);
    const labels = tArr.map(t => t);

    if (compareMode) {
        typeLabel.textContent = 'Comparativa';
        typeLabel.style.color = '#8B5CF6';
        cardType.style.borderColor = 'rgba(139, 92, 246, 0.3)';

        const presets = [
            { z: 0.3, label: 'Subamortiguado (ζ=0.3)', color: '#3B82F6', dash: [] },
            { z: 1.0, label: 'Crítico (ζ=1)', color: '#10B981', dash: [6, 4] },
            { z: 2.0, label: 'Sobreamortiguado (ζ=2)', color: '#F59E0B', dash: [3, 4] },
        ];
        
        const datasets = presets.map(p => ({
            label: p.label,
            data: (isStep ? stepResponse(p.z, wn, tArr) : impulseResponse(p.z, wn, tArr)).map((y, i) => ({ x: tArr[i], y })),
            borderColor: p.color,
            borderWidth: 2.5,
            borderDash: p.dash,
            pointRadius: 0,
            fill: false,
            tension: 0.3
        }));
        
        // Reference 
        if (isStep) {
            datasets.push({
                label: 'Escalón unitario',
                data: tArr.map(t => ({ x: t, y: t >= 0 ? 1 : 0 })),
                borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, fill: false
            });
        }

        buildChart(datasets, labels);
        renderLegend(presets.map(p => ({ label: p.label, color: p.color })).concat(isStep ? [{ label: 'Escalón unitario', color: 'rgba(255,255,255,0.4)' }] : []));

        // Clear Metrics
        tsVal.textContent = '—';
        osVal.textContent = '—';
        wdVal.textContent = '—';
        
        // Hide/Clear S-Plane
        if (sPlaneChart) { sPlaneChart.destroy(); sPlaneChart = null; }
    } else {
        const y = isStep ? stepResponse(zeta, wn, tArr) : impulseResponse(zeta, wn, tArr);
        
        // Only compute settlement metrics properly for step response
        let m = { os: '—', ts: '—', wd: zeta < 1 ? (wn * Math.sqrt(1 - zeta * zeta)).toFixed(3) : '—' };
        if (isStep) {
            m = computeStepMetrics(zeta, wn, y, tArr);
        }
        
        tsVal.textContent = m.ts;
        osVal.textContent = isStep && zeta < 1 ? m.os : '—';
        wdVal.textContent = m.wd;

        const datasets = [
            {
                label: `Respuesta (ζ=${zeta.toFixed(2)})`,
                data: [], // Starts empty, filled by animation loop
                borderColor: cls.color,
                borderWidth: 3,
                pointRadius: 0,
                fill: false,
                tension: 0.3
            }
        ];

        if (isStep) {
            datasets.push({
                label: 'Escalón unitario',
                data: tArr.map(t => ({ x: t, y: t >= 0 ? 1 : 0 })),
                borderColor: 'rgba(255,255,255,0.2)', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false
            });
            datasets.push({
                label: 'Límite superior +2%',
                data: tArr.map(t => ({ x: t, y: 1.02 })),
                borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, pointRadius: 0, fill: false
            });
            datasets.push({
                label: 'Límite inferior -2%',
                data: tArr.map(t => ({ x: t, y: 0.98 })),
                borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, pointRadius: 0, fill: false
            });
            renderLegend([
                { label: `Respuesta (ζ=${zeta.toFixed(2)})`, color: cls.color },
                { label: 'Referencia (escalón)', color: 'rgba(255,255,255,0.4)' }
            ]);
        } else {
            // Impulse reference line
            datasets.push({
                label: 'Impulso (aprox)',
                data: tArr.map(t => ({ x: t, y: t === 0 ? wn*10 : 0 })), // draw a fake line at t=0
                borderColor: 'rgba(255,255,255,0.1)', borderDash: [2, 2], borderWidth: 1.5, pointRadius: 0, fill: false
            });
            renderLegend([
                { label: `Respuesta (ζ=${zeta.toFixed(2)})`, color: cls.color }
            ]);
        }

        buildChart(datasets, labels);
        
        // Build S-Plane
        const poles = getPoles(zeta, wn);
        buildSPlaneChart(poles, cls.color);
    }

    // Update Equation Params Box
    eqParams.innerHTML = `Parámetros actuales: ζ = <strong>${zeta.toFixed(2)}</strong>, ωₙ = <strong>${wn.toFixed(1)}</strong> rad/s <br> 
                          2ζωₙ = <strong>${(2 * zeta * wn).toFixed(3)}</strong>, ωₙ² = <strong>${(wn * wn).toFixed(2)}</strong>`;
                          
    updateActivePreset();
    startAnimation();
}

function updateActivePreset() {
    presetBtns.forEach(btn => btn.classList.remove('active'));
    if (compareMode) {
        document.querySelector('.btn-compare').classList.add('active');
        return;
    }
    const z = parseFloat(zetaInput.value);
    if (z === 0.3) document.querySelector('.btn-sub').classList.add('active');
    else if (z === 1.0) document.querySelector('.btn-crit').classList.add('active');
    else if (z === 2.0) document.querySelector('.btn-sob').classList.add('active');
}

function setPreset(type) {
    compareMode = false;
    if (type === 'compare') {
        compareMode = true;
        render();
        return;
    }
    const map = { sub: [0.3, 1, 40], crit: [1.0, 1, 25], sob: [2.0, 1, 20] };
    const [z, w, t] = map[type];
    zetaInput.value = z;
    wnInput.value = w;
    tmaxInput.value = t;
    render();
}

// Animation Logic
let isDragging = false;
let dragX = 0;
let freeResponseX0 = null;

function resizeSimCanvas() {
    if (!simCanvas) return;
    const parent = simCanvas.parentElement;
    simCanvas.width = parent.clientWidth;
    simCanvas.height = parent.clientHeight;
}

function drawSimFrame(y, zeta, isStep) {
    if (!simCtx) return;
    const w = simCanvas.width;
    const h = simCanvas.height;
    
    simCtx.clearRect(0, 0, w, h);
    
    const wallX = 40;
    // Base resting position (y=0 in math)
    const basePos = w / 2 - 40;
    
    // Scale: y=1 means it moves 80px to the right
    const scale = 80;
    const currentX = basePos + y * scale;
    
    // Floor
    simCtx.beginPath();
    simCtx.moveTo(wallX - 10, h - 20);
    simCtx.lineTo(w - 20, h - 20);
    simCtx.strokeStyle = '#374151';
    simCtx.lineWidth = 4;
    simCtx.stroke();
    
    // Wall
    simCtx.fillStyle = '#4B5563';
    simCtx.fillRect(wallX - 20, 20, 20, h - 40);
    
    const massW = 50;
    const massH = 50;
    const massY = h - 20 - massH;
    
    // Spring
    simCtx.beginPath();
    const springY = massY + massH / 4;
    simCtx.moveTo(wallX, springY);
    
    const springPoints = 24;
    const springLen = currentX - wallX;
    const segment = springLen / springPoints;
    
    for (let i = 1; i <= springPoints; i++) {
        const sign = (i % 2 === 0) ? 1 : -1;
        const yy = springY + (i === springPoints ? 0 : sign * 12);
        simCtx.lineTo(wallX + i * segment, yy);
    }
    simCtx.strokeStyle = '#9CA3AF';
    simCtx.lineWidth = 3;
    simCtx.stroke();
    
    // Damper
    const damperY = massY + (3 * massH) / 4;
    const cylW = Math.max(40, basePos - wallX - 30); // fixed cylinder width
    
    // Cylinder
    simCtx.beginPath();
    simCtx.moveTo(wallX, damperY);
    simCtx.lineTo(wallX + cylW, damperY);
    simCtx.moveTo(wallX + cylW, damperY - 8);
    simCtx.lineTo(wallX + cylW, damperY + 8);
    simCtx.moveTo(wallX + cylW, damperY - 8);
    simCtx.lineTo(wallX + cylW - 15, damperY - 8);
    simCtx.moveTo(wallX + cylW, damperY + 8);
    simCtx.lineTo(wallX + cylW - 15, damperY + 8);
    simCtx.strokeStyle = '#9CA3AF';
    simCtx.lineWidth = 3;
    simCtx.stroke();
    
    // Piston
    simCtx.beginPath();
    simCtx.moveTo(currentX, damperY);
    simCtx.lineTo(wallX + cylW - 5, damperY);
    simCtx.moveTo(wallX + cylW - 5, damperY - 6);
    simCtx.lineTo(wallX + cylW - 5, damperY + 6);
    simCtx.strokeStyle = '#F3F4F6';
    simCtx.lineWidth = 3;
    simCtx.stroke();
    
    // Mass
    const cls = classifySystem(zeta);
    simCtx.fillStyle = cls.color;
    simCtx.fillRect(currentX, massY, massW, massH);
    simCtx.strokeStyle = '#fff';
    simCtx.lineWidth = 2;
    simCtx.strokeRect(currentX, massY, massW, massH);
    
    // Target Line (if Step)
    if (isStep) {
        const targetX = basePos + 1 * scale;
        simCtx.beginPath();
        simCtx.moveTo(targetX + massW/2, h - 15);
        simCtx.lineTo(targetX + massW/2, 20);
        simCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        simCtx.lineWidth = 1;
        simCtx.setLineDash([5, 5]);
        simCtx.stroke();
        simCtx.setLineDash([]);
        
        simCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        simCtx.font = '12px Outfit';
        simCtx.fillText('Objetivo', targetX + massW/2 + 5, 35);
    }
}

function renderSimulationLoop(timestamp) {
    if (!animStartTime) animStartTime = timestamp;
    const elapsed = (timestamp - animStartTime) / 1000;
    
    const zeta = parseFloat(zetaInput.value);
    const wn = parseFloat(wnInput.value);
    const isStep = inputType.value === 'step';
    const tmax = parseInt(tmaxInput.value);
    
    const simSpeed = tmax / 5; // ~5 seconds real time
    const simTime = elapsed * simSpeed;
    
    let y = 0;
    if (isDragging) {
        y = dragX;
    } else if (freeResponseX0 !== null) {
        // Free response with initial condition x0
        const stepY = stepResponse(zeta, wn, [simTime])[0];
        if (isStep) {
            y = 1 + (freeResponseX0 - 1) * (1 - stepY); // Settles at 1
        } else {
            y = freeResponseX0 * (1 - stepY); // Settles at 0
        }
    } else if (isStep) {
        y = stepResponse(zeta, wn, [simTime])[0];
    } else {
        y = impulseResponse(zeta, wn, [simTime])[0];
    }
    
    drawSimFrame(y, zeta, isStep && freeResponseX0 === null);
    
    // Live update the chart
    if (chart && chart.data.datasets[0] && !compareMode) {
        chart.data.datasets[0].data.push({ x: simTime, y: y });
        chart.update('none');
    }
    
    if (simTime < tmax && !isDragging) {
        animationId = requestAnimationFrame(renderSimulationLoop);
    } else if (!isDragging) {
        let finalY = 0;
        if (freeResponseX0 !== null) {
            const stepY = stepResponse(zeta, wn, [tmax])[0];
            finalY = isStep ? 1 + (freeResponseX0 - 1) * (1 - stepY) : freeResponseX0 * (1 - stepY);
        } else {
            finalY = isStep ? stepResponse(zeta, wn, [tmax])[0] : impulseResponse(zeta, wn, [tmax])[0];
        }
        drawSimFrame(finalY, zeta, isStep && freeResponseX0 === null);
        
        if (chart && chart.data.datasets[0] && !compareMode) {
            chart.data.datasets[0].data.push({ x: tmax, y: finalY });
            chart.update('none');
        }
    }
}

function startAnimation() {
    if (compareMode) {
        if (animationId) cancelAnimationFrame(animationId);
        resizeSimCanvas();
        simCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);
        simCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        simCtx.font = '14px Outfit';
        simCtx.textAlign = 'center';
        simCtx.fillText('Animación no disponible en modo comparativa', simCanvas.width/2, simCanvas.height/2);
        simCtx.textAlign = 'left';
        return;
    }
    
    resizeSimCanvas();
    if (animationId) cancelAnimationFrame(animationId);
    animStartTime = 0;
    freeResponseX0 = null; // reset to normal when clicking buttons
    
    // Clear chart data for live drawing
    if (chart && chart.data.datasets[0] && !compareMode) {
        chart.data.datasets[0].data = [];
        chart.update('none');
    }
    
    animationId = requestAnimationFrame(renderSimulationLoop);
}

// Event Listeners
zetaInput.addEventListener('input', () => { compareMode = false; render(); });
wnInput.addEventListener('input', () => { compareMode = false; render(); });
tmaxInput.addEventListener('input', render);
inputType.addEventListener('change', render);

btnExport.addEventListener('click', () => {
    if (!chart) return;
    const link = document.createElement('a');
    link.download = `grafica_${inputType.value}_z${zetaInput.value}.png`;
    link.href = chart.toBase64Image();
    link.click();
});

presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        setPreset(e.currentTarget.getAttribute('data-type'));
    });
});

btnReplay.addEventListener('click', startAnimation);

window.addEventListener('resize', () => {
    startAnimation();
});

// Canvas Interactions
if (simCanvas) {
    simCanvas.addEventListener('mousedown', (e) => {
        if (compareMode) return;
        const rect = simCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        const w = simCanvas.width;
        const basePos = w / 2 - 40;
        const scale = 80;
        
        // Estimate current Y
        let y = 0;
        const isStep = inputType.value === 'step';
        if (freeResponseX0 !== null) {
            const stepY = stepResponse(parseFloat(zetaInput.value), parseFloat(wnInput.value), [((Date.now() - (animStartTime||Date.now())) / 1000) * (parseInt(tmaxInput.value) / 5)])[0];
            y = isStep ? 1 + (freeResponseX0 - 1) * (1 - stepY) : freeResponseX0 * (1 - stepY);
        } else if (isStep) {
            y = stepResponse(parseFloat(zetaInput.value), parseFloat(wnInput.value), [((Date.now() - (animStartTime||Date.now())) / 1000) * (parseInt(tmaxInput.value) / 5)])[0];
        } else {
            y = impulseResponse(parseFloat(zetaInput.value), parseFloat(wnInput.value), [((Date.now() - (animStartTime||Date.now())) / 1000) * (parseInt(tmaxInput.value) / 5)])[0];
        }
        
        const currentX = basePos + y * scale;
        const massW = 50;
        
        // Check if clicked on mass
        if (mouseX >= currentX && mouseX <= currentX + massW) {
            isDragging = true;
            dragX = y;
            if (animationId) cancelAnimationFrame(animationId);
            drawSimFrame(dragX, parseFloat(zetaInput.value), false);
        } else {
            // Apply impulse
            inputType.value = 'impulse';
            render();
        }
    });

    simCanvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = simCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const w = simCanvas.width;
        const basePos = w / 2 - 40;
        const scale = 80;
        
        dragX = (mouseX - 25 - basePos) / scale;
        
        if (dragX < -1.5) dragX = -1.5;
        if (dragX > 2.5) dragX = 2.5;
        
        drawSimFrame(dragX, parseFloat(zetaInput.value), false);
    });

    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            freeResponseX0 = dragX;
            animStartTime = 0;
            
            // Clear chart for new drawing
            if (chart && chart.data.datasets[0] && !compareMode) {
                chart.data.datasets[0].data = [];
                chart.update('none');
            }
            
            animationId = requestAnimationFrame(renderSimulationLoop);
        }
    };

    simCanvas.addEventListener('mouseup', stopDrag);
    simCanvas.addEventListener('mouseleave', stopDrag);
}

// Initial Render
render();
