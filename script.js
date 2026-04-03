/* =====================================================
   THE THRESHOLD — script.js
   Particles | Sound Engine | 4 Playable Games
   Leaderboard | Countdown | Animations
   ===================================================== */

'use strict';

// ─────────────────────────────────────────────
//  SOUND ENGINE (Web Audio API)
// ─────────────────────────────────────────────
const SoundEngine = (() => {
    let ctx = null;
    let enabled = true;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function resumeCtx() {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        return c;
    }

    function playTone(freq, type, duration, vol = 0.25, delay = 0) {
        if (!enabled) return;
        try {
            const c = resumeCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime + delay);
            gain.gain.setValueAtTime(0, c.currentTime + delay);
            gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
            osc.start(c.currentTime + delay);
            osc.stop(c.currentTime + delay + duration + 0.05);
        } catch (e) {}
    }

    function playNoise(duration, vol = 0.1) {
        if (!enabled) return;
        try {
            const c = resumeCtx();
            const bufferSize = c.sampleRate * duration;
            const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const src = c.createBufferSource();
            src.buffer = buffer;
            const gain = c.createGain();
            src.connect(gain);
            gain.connect(c.destination);
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            src.start();
        } catch (e) {}
    }

    return {
        setEnabled: (v) => { enabled = v; },
        isEnabled: () => enabled,
        hover: () => playTone(880, 'sine', 0.08, 0.12),
        click: () => { playTone(660, 'square', 0.06, 0.15); playTone(880, 'sine', 0.1, 0.1, 0.03); },
        success: () => { [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.2, 0.2, i * 0.08)); },
        error: () => { playTone(220, 'sawtooth', 0.2, 0.3); playTone(180, 'sawtooth', 0.2, 0.25, 0.1); },
        gameJump: () => playTone(440, 'square', 0.15, 0.2),
        gameCollect: () => { playTone(880, 'sine', 0.1, 0.3); playTone(1320, 'sine', 0.08, 0.2, 0.05); },
        gameDie: () => { playTone(300, 'sawtooth', 0.1, 0.3); playTone(200, 'sawtooth', 0.15, 0.3, 0.1); playNoise(0.3, 0.15); },
        gameFall: () => playTone(200, 'sine', 0.3, 0.3),
        gameFreeze: () => { [800, 600, 400, 200].forEach((f, i) => playTone(f, 'triangle', 0.15, 0.2, i * 0.06)); },
        gameWin: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'sine', 0.3, 0.25, i * 0.07)); },
        uiOpen: () => { playTone(440, 'sine', 0.1, 0.15); playTone(550, 'sine', 0.12, 0.12, 0.05); },
        uiClose: () => { playTone(550, 'sine', 0.1, 0.15); playTone(440, 'sine', 0.08, 0.12, 0.05); },
        tick: () => playTone(1600, 'square', 0.04, 0.08),
    };
})();

// ─────────────────────────────────────────────
//  PARTICLE SYSTEM
// ─────────────────────────────────────────────
const ParticleSystem = (() => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return { init: () => {} };
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    const COLORS = ['0,229,255', '255,184,0', '255,61,113', '0,229,255'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.floor((canvas.width * canvas.height) / 12000);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 0.3,
                alpha: Math.random() * 0.5 + 0.1,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                pulse: Math.random() * Math.PI * 2,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.pulse += 0.02;
            const alpha = p.alpha * (0.8 + 0.2 * Math.sin(p.pulse));

            // Mouse interaction
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                const force = (120 - dist) / 120 * 0.015;
                p.vx -= dx * force;
                p.vy -= dy * force;
            }

            // Friction
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;

            // Wrap
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${alpha})`;
            ctx.fill();
        });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0,229,255,${(1 - dist / 100) * 0.08})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    return {
        init() {
            resize();
            createParticles();
            window.addEventListener('resize', () => { resize(); createParticles(); });
            document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
            draw();
        }
    };
})();

// ─────────────────────────────────────────────
//  SCROLL PROGRESS BAR
// ─────────────────────────────────────────────
function initScrollProgress() {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const pct = (window.scrollY / total) * 100;
        bar.style.width = pct + '%';
    });
}

// ─────────────────────────────────────────────
//  NAVBAR SCROLL EFFECT
// ─────────────────────────────────────────────
function initNavbar() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 30px rgba(0,229,255,0.1)';
            header.style.background = 'rgba(4,7,15,0.98)';
        } else {
            header.style.boxShadow = '';
            header.style.background = '';
        }
    });
}

// ─────────────────────────────────────────────
//  MOBILE MENU
// ─────────────────────────────────────────────
function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');
        if (isOpen) {
            menu.classList.add('hidden');
            toggle.classList.remove('active');
            SoundEngine.uiClose();
        } else {
            menu.classList.remove('hidden');
            menu.style.display = 'flex';
            toggle.classList.add('active');
            SoundEngine.uiOpen();
        }
    });
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
            toggle.classList.remove('active');
        });
    });
}

// ─────────────────────────────────────────────
//  FADE IN SECTIONS
// ─────────────────────────────────────────────
function initFadeIn() {
    const sections = document.querySelectorAll('.fade-in-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, i * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    sections.forEach(s => observer.observe(s));
}

// ─────────────────────────────────────────────
//  RIPPLE BUTTONS
// ─────────────────────────────────────────────
function initRipple() {
    document.querySelectorAll('.btn-ripple').forEach(btn => {
        btn.addEventListener('click', function (e) {
            SoundEngine.click();
            const r = document.createElement('span');
            r.className = 'ripple';
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
            this.appendChild(r);
            setTimeout(() => r.remove(), 700);
        });
    });
}

// ─────────────────────────────────────────────
//  COUNTDOWN TIMER
// ─────────────────────────────────────────────
function initCountdown() {
    const target = new Date('2026-03-15T23:59:59');
    const els = {
        days: document.getElementById('cd-days'),
        hours: document.getElementById('cd-hours'),
        mins: document.getElementById('cd-mins'),
        secs: document.getElementById('cd-secs'),
    };
    if (!els.days) return;

    function pad(n) { return String(n).padStart(2, '0'); }

    function update() {
        const now = new Date();
        const diff = target - now;
        if (diff <= 0) {
            Object.values(els).forEach(el => { if (el) el.textContent = '00'; });
            return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        els.days.textContent = pad(d);
        els.hours.textContent = pad(h);
        els.mins.textContent = pad(m);
        if (els.secs.textContent !== pad(s)) {
            els.secs.textContent = pad(s);
            // Tick animation
            els.secs.style.transform = 'scale(1.15)';
            els.secs.style.color = '#FFB800';
            setTimeout(() => {
                els.secs.style.transform = 'scale(1)';
                els.secs.style.color = '';
            }, 150);
        }
    }
    update();
    setInterval(update, 1000);
}

// ─────────────────────────────────────────────
//  STAT COUNTERS
// ─────────────────────────────────────────────
function initStatCounters() {
    const counters = document.querySelectorAll('.stat-counter');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target) || 0;
                let current = 0;
                const step = Math.max(1, Math.ceil(target / 40));
                const interval = setInterval(() => {
                    current = Math.min(current + step, target);
                    el.textContent = current + (target > 4 ? '+' : '');
                    if (current >= target) clearInterval(interval);
                }, 40);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
}

// ─────────────────────────────────────────────
//  LEADERBOARD DATA
// ─────────────────────────────────────────────
const leaderboardData = {
    overall: [
        { rank: 1, team: 'GHOST PROTOCOL', members: 'A.Sharma, R.Khan, P.Lee', score: 9840, completed: 4, status: 'active' },
        { rank: 2, team: 'IRON CIRCUIT',   members: 'M.Davis, J.Wang',          score: 9210, completed: 4, status: 'active' },
        { rank: 3, team: 'VORTEX UNIT',    members: 'S.Patel, T.Kim, N.Cruz',   score: 8760, completed: 3, status: 'active' },
        { rank: 4, team: 'DELTA FORCE X',  members: 'C.Brown, E.Wilson, D.Lim', score: 8200, completed: 3, status: 'active' },
        { rank: 5, team: 'NEXUS PRIME',    members: 'L.Chen, O.Smith',           score: 7650, completed: 2, status: 'active' },
        { rank: 6, team: 'BLACKSITE 7',    members: 'H.Jones, B.Nair, V.Das',   score: 6900, completed: 2, status: 'active' },
        { rank: 7, team: 'ZERO KELVIN',    members: 'F.Meyer, I.Hassan',         score: 5500, completed: 1, status: 'eliminated' },
    ],
    cryogenic: [
        { rank: 1, team: 'ZERO KELVIN',   members: 'F.Meyer, I.Hassan',         score: 2980, completed: 1, status: 'active' },
        { rank: 2, team: 'GHOST PROTOCOL',members: 'A.Sharma, R.Khan, P.Lee',   score: 2750, completed: 1, status: 'active' },
        { rank: 3, team: 'IRON CIRCUIT',  members: 'M.Davis, J.Wang',           score: 2600, completed: 1, status: 'active' },
    ],
    pressure: [
        { rank: 1, team: 'GHOST PROTOCOL',members: 'A.Sharma, R.Khan, P.Lee',   score: 2440, completed: 1, status: 'active' },
        { rank: 2, team: 'IRON CIRCUIT',  members: 'M.Davis, J.Wang',           score: 2310, completed: 1, status: 'active' },
        { rank: 3, team: 'VORTEX UNIT',   members: 'S.Patel, T.Kim, N.Cruz',    score: 2200, completed: 1, status: 'active' },
    ],
    blackout: [
        { rank: 1, team: 'NEXUS PRIME',   members: 'L.Chen, O.Smith',           score: 3100, completed: 1, status: 'active' },
        { rank: 2, team: 'VORTEX UNIT',   members: 'S.Patel, T.Kim, N.Cruz',    score: 2900, completed: 1, status: 'active' },
        { rank: 3, team: 'DELTA FORCE X', members: 'C.Brown, E.Wilson, D.Lim',  score: 2700, completed: 1, status: 'active' },
    ],
    fracture: [
        { rank: 1, team: 'GHOST PROTOCOL',members: 'A.Sharma, R.Khan, P.Lee',   score: 4650, completed: 1, status: 'active' },
        { rank: 2, team: 'DELTA FORCE X', members: 'C.Brown, E.Wilson, D.Lim',  score: 3900, completed: 1, status: 'active' },
        { rank: 3, team: 'BLACKSITE 7',   members: 'H.Jones, B.Nair, V.Das',    score: 3500, completed: 1, status: 'active' },
    ],
};

function renderLeaderboard(filter = 'overall') {
    const tbody = document.getElementById('leaderboard-data');
    if (!tbody) return;
    const data = leaderboardData[filter] || leaderboardData.overall;

    const rankIcons = ['🥇', '🥈', '🥉'];
    const statusColor = { active: '#00E5FF', eliminated: '#FF3D71' };

    tbody.innerHTML = data.map((row, i) => `
        <tr class="lb-row border-b border-surface-dark ${i < 3 ? 'rank-' + (i + 1) : ''}">
            <td class="px-4 py-4 font-heading font-bold text-text-primary text-lg">
                ${i < 3 ? rankIcons[i] : '#' + row.rank}
            </td>
            <td class="px-4 py-4">
                <span class="font-heading font-bold text-sm text-text-primary">${row.team}</span>
            </td>
            <td class="px-4 py-4 text-xs text-text-secondary hidden sm:table-cell">${row.members}</td>
            <td class="px-4 py-4 font-mono font-bold" style="color:var(--neon-cyan)">${row.score.toLocaleString()}</td>
            <td class="px-4 py-4 text-text-secondary hidden md:table-cell">${row.completed}/4</td>
            <td class="px-4 py-4">
                <span class="font-mono text-xs px-2 py-1 rounded-full border" style="color:${statusColor[row.status] || '#8A96A8'};border-color:${statusColor[row.status] || '#8A96A8'};background:${statusColor[row.status] || '#8A96A8'}22">
                    ${row.status.toUpperCase()}
                </span>
            </td>
        </tr>
    `).join('');
}

function initLeaderboard() {
    renderLeaderboard('overall');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            SoundEngine.click();
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-neon-cyan', 'text-primary-dark');
                b.classList.add('bg-surface-dark', 'text-text-primary');
            });
            this.classList.add('active', 'bg-neon-cyan', 'text-primary-dark');
            this.classList.remove('bg-surface-dark', 'text-text-primary');
            renderLeaderboard(this.dataset.filter);
        });
    });
}

// ─────────────────────────────────────────────
//  SOUND TOGGLE BUTTON
// ─────────────────────────────────────────────
function initSoundToggle() {
    const btn = document.getElementById('sound-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const next = !SoundEngine.isEnabled();
        SoundEngine.setEnabled(next);
        btn.textContent = next ? '🔊' : '🔇';
        btn.style.opacity = next ? '1' : '0.5';
        if (next) SoundEngine.click();
    });
}

// ─────────────────────────────────────────────
//  TYPING ANIMATION
// ─────────────────────────────────────────────
function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const texts = ['SURVIVAL COMPETITION 2026', 'TEST YOUR LIMITS', 'FORGE YOUR LEGEND', '$10,000 PRIZE POOL'];
    let textIdx = 0, charIdx = 0, deleting = false;

    function type() {
        const full = texts[textIdx];
        if (!deleting) {
            el.textContent = full.slice(0, ++charIdx);
            if (charIdx === full.length) { deleting = true; setTimeout(type, 2000); return; }
        } else {
            el.textContent = full.slice(0, --charIdx);
            if (charIdx === 0) { deleting = false; textIdx = (textIdx + 1) % texts.length; }
        }
        setTimeout(type, deleting ? 50 : 90);
    }
    type();
}

// ─────────────────────────────────────────────
//  NEWSLETTER
// ─────────────────────────────────────────────
function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        SoundEngine.success();
        const btn = form.querySelector('button');
        btn.textContent = '✓ Subscribed!';
        btn.style.background = '#00FF88';
        setTimeout(() => { btn.textContent = 'Subscribe'; btn.style.background = ''; }, 3000);
    });
}

// ─────────────────────────────────────────────
//  GAME MODAL
// ─────────────────────────────────────────────
let activeGame = null;

function openGame(name) {
    SoundEngine.uiOpen();
    const modal = document.getElementById('game-modal');
    const content = document.getElementById('modal-content');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const builders = {
        cryogenic: buildCryogenicGame,
        pressure: buildPressureGame,
        blackout: buildBlackoutGame,
        fracture: buildFractureGame,
    };

    content.innerHTML = '';
    if (builders[name]) builders[name](content);
    activeGame = name;
}

function closeGame() {
    SoundEngine.uiClose();
    if (activeGame) stopGame(activeGame);
    activeGame = null;
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('modal-content').innerHTML = '';
}

function initModal() {
    const closeBtn = document.getElementById('modal-close');
    const modal = document.getElementById('game-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeGame);
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeGame(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && activeGame) closeGame(); });
}

// ─────────────────────────────────────────────
//  GAME HELPERS
// ─────────────────────────────────────────────
const gameLoops = {};
function stopGame(name) {
    if (gameLoops[name]) { cancelAnimationFrame(gameLoops[name]); delete gameLoops[name]; }
}

function gameHeader(title, color, icon) {
    return `<div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
            <span class="text-4xl">${icon}</span>
            <h2 class="text-xl font-heading font-bold" style="color:${color}">${title}</h2>
        </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  GAME 1: CRYOGENIC ESCAPE — Ice Block Puzzle
// ─────────────────────────────────────────────
function buildCryogenicGame(container) {
    container.innerHTML = `
        ${gameHeader('CRYOGENIC ESCAPE', '#00E5FF', '🧊')}
        <p class="text-text-secondary text-sm mb-4 font-mono">Slide ice blocks to fill the exit path. Temperature drops every second. WASD/Arrow keys or click to select & move. Reach 🚪 to escape!</p>
        <div class="flex items-center gap-6 mb-4 font-mono text-sm">
            <span>Temp: <strong id="cryo-temp" style="color:#00E5FF">-10°C</strong></span>
            <span>Moves: <strong id="cryo-moves" style="color:#FFB800">0</strong></span>
            <span>Level: <strong id="cryo-level" style="color:#FF3D71">1</strong></span>
        </div>
        <div class="relative mb-2">
            <div class="w-full h-2 rounded-full mb-4" style="background:#141B2D">
                <div id="cryo-bar" class="h-full rounded-full transition-all" style="width:100%;background:linear-gradient(90deg,#00E5FF,#00AAFF)"></div>
            </div>
        </div>
        <canvas id="cryo-canvas" style="width:100%;max-width:560px;height:400px;display:block;margin:0 auto;border:1px solid rgba(0,229,255,0.2);border-radius:8px;background:#060D1A;cursor:pointer"></canvas>
        <div id="cryo-msg" class="text-center mt-3 font-mono text-sm" style="color:#00E5FF;min-height:24px"></div>
        <div class="flex gap-3 justify-center mt-4 flex-wrap">
            <button class="btn-g" onclick="restartCryo()">↺ Restart</button>
            <button class="btn-g amber" onclick="nextCryoLevel()" id="next-cryo" style="display:none">Next Level →</button>
        </div>
    `;

    // Game state
    const TILE = 70;
    const COLS = 8, ROWS = 5;
    let temp = -10, moves = 0, level = 1;
    let selected = null;
    let gameOver = false, won = false;
    let tempInterval = null;

    // Level grids: 0=empty, 1=ice, 2=block, 3=exit, 4=wall, 5=heat
    const levels = [
        // Level 1
        [
            [0,0,0,0,0,0,0,0],
            [0,4,2,0,0,2,4,0],
            [0,0,0,0,0,0,0,3],
            [0,4,2,0,0,2,4,0],
            [0,0,0,0,0,0,0,0],
        ],
        // Level 2
        [
            [0,4,0,0,0,0,4,0],
            [0,0,2,0,0,2,0,0],
            [5,0,0,0,0,0,0,3],
            [0,0,2,0,0,2,0,0],
            [0,4,0,0,0,0,4,0],
        ],
    ];

    let grid = levels[0].map(r => [...r]);
    let playerPos = { x: 0, y: 2 };

    function getCanvas() { return document.getElementById('cryo-canvas'); }
    function getCtx() { const c = getCanvas(); return c ? c.getContext('2d') : null; }

    function initCanvas() {
        const c = getCanvas();
        if (!c) return;
        c.width = COLS * TILE;
        c.height = ROWS * TILE;
    }

    function draw() {
        const c = getCanvas();
        const ctx = getCtx();
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);

        // Grid
        for (let r = 0; r < ROWS; r++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * TILE, y = r * TILE;
                const cell = grid[r][col];
                // Background
                ctx.fillStyle = '#060D1A';
                ctx.fillRect(x, y, TILE, TILE);
                // Grid line
                ctx.strokeStyle = 'rgba(0,229,255,0.06)';
                ctx.strokeRect(x, y, TILE, TILE);

                if (cell === 1) { // Ice patch
                    ctx.fillStyle = 'rgba(0,200,255,0.12)';
                    ctx.fillRect(x+2, y+2, TILE-4, TILE-4);
                }
                if (cell === 2) { // Block
                    const grad = ctx.createLinearGradient(x, y, x+TILE, y+TILE);
                    grad.addColorStop(0, '#0A3A5C');
                    grad.addColorStop(1, '#041C30');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x+4, y+4, TILE-8, TILE-8);
                    ctx.strokeStyle = '#00E5FF';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x+4, y+4, TILE-8, TILE-8);
                    ctx.fillStyle = 'rgba(0,229,255,0.2)';
                    ctx.font = '28px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🧊', x + TILE/2, y + TILE/2 + 10);
                }
                if (cell === 4) { // Wall
                    ctx.fillStyle = '#1A2438';
                    ctx.fillRect(x+2, y+2, TILE-4, TILE-4);
                    ctx.strokeStyle = '#333';
                    ctx.strokeRect(x+2, y+2, TILE-4, TILE-4);
                }
                if (cell === 3) { // Exit
                    ctx.fillStyle = 'rgba(0,255,100,0.15)';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#00FF88';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x+2, y+2, TILE-4, TILE-4);
                    ctx.font = '30px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🚪', x + TILE/2, y + TILE/2 + 10);
                }
                if (cell === 5) { // Heat vent
                    ctx.fillStyle = 'rgba(255,100,0,0.2)';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.font = '28px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🔥', x + TILE/2, y + TILE/2 + 10);
                }
            }
        }

        // Player
        const px = playerPos.x * TILE, py = playerPos.y * TILE;
        ctx.beginPath();
        ctx.arc(px + TILE/2, py + TILE/2, TILE/2 - 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.2)';
        ctx.fill();
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🧑', px + TILE/2, py + TILE/2 + 10);

        // Overlay for end
        if (gameOver && !won) {
            ctx.fillStyle = 'rgba(4,7,15,0.85)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = '#FF3D71';
            ctx.font = 'bold 36px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FROZEN!', c.width/2, c.height/2 - 10);
            ctx.fillStyle = '#8A96A8';
            ctx.font = '14px JetBrains Mono, monospace';
            ctx.fillText('Press Restart', c.width/2, c.height/2 + 30);
        }
        if (won) {
            ctx.fillStyle = 'rgba(4,7,15,0.85)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = '#00FF88';
            ctx.font = 'bold 34px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ESCAPED! 🎉', c.width/2, c.height/2 - 10);
            ctx.fillStyle = '#FFB800';
            ctx.font = '14px JetBrains Mono, monospace';
            ctx.fillText(`Moves: ${moves}`, c.width/2, c.height/2 + 30);
        }
    }

    function movePlayer(dx, dy) {
        if (gameOver || won) return;
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
        const cell = grid[ny][nx];
        if (cell === 4) return; // Wall
        if (cell === 2) { // Push block
            const bx = nx + dx, by = ny + dy;
            if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return;
            if (grid[by][bx] !== 0 && grid[by][bx] !== 1) return;
            grid[by][bx] = 2;
            grid[ny][nx] = 0;
        }
        playerPos.x = nx;
        playerPos.y = ny;
        moves++;
        document.getElementById('cryo-moves').textContent = moves;

        // Heat vent restores temp
        if (cell === 5) { temp = Math.min(-10, temp + 20); SoundEngine.gameCollect(); }

        // Exit check
        if (cell === 3) { won = true; clearInterval(tempInterval); SoundEngine.gameWin(); document.getElementById('next-cryo').style.display = 'inline-block'; document.getElementById('cryo-msg').textContent = '✓ You escaped the chamber!'; }
        else SoundEngine.gameJump();
        draw();
    }

    function startTemp() {
        clearInterval(tempInterval);
        tempInterval = setInterval(() => {
            if (gameOver || won) return;
            temp -= 5;
            const el = document.getElementById('cryo-temp');
            if (el) { el.textContent = temp + '°C'; el.style.color = temp < -50 ? '#FF3D71' : temp < -30 ? '#FFB800' : '#00E5FF'; }
            const pct = Math.max(0, ((temp + 10) / 80) * 100 + ((temp + 90) / 90) * 100);
            const bar = document.getElementById('cryo-bar');
            if (bar) { bar.style.width = Math.max(0, Math.min(100, (temp + 100) / 90 * 100)) + '%'; bar.style.background = temp < -50 ? '#FF3D71' : temp < -30 ? '#FFB800' : 'linear-gradient(90deg,#00E5FF,#00AAFF)'; }
            if (temp <= -80) { gameOver = true; clearInterval(tempInterval); SoundEngine.gameFreeze(); draw(); }
        }, 3000);
    }

    function handleKey(e) {
        const map = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1], a:[-1,0], d:[1,0], w:[0,-1], s:[0,1] };
        const dir = map[e.key];
        if (dir) { e.preventDefault(); movePlayer(...dir); }
    }

    // Canvas click to move
    function handleClick(e) {
        if (gameOver || won) return;
        const c = getCanvas();
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const cx = Math.floor((e.clientX - rect.left) * scaleX / TILE);
        const cy = Math.floor((e.clientY - rect.top) * scaleY / TILE);
        const dx = cx - playerPos.x;
        const dy = cy - playerPos.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) movePlayer(dx, dy);
    }

    window._cryoKey = handleKey;
    document.addEventListener('keydown', handleKey);
    const canvas = getCanvas();
    if (canvas) canvas.addEventListener('click', handleClick);

    window.restartCryo = function () {
        clearInterval(tempInterval);
        temp = -10; moves = 0; gameOver = false; won = false;
        grid = levels[(level - 1) % levels.length].map(r => [...r]);
        playerPos = { x: 0, y: 2 };
        document.getElementById('cryo-temp').textContent = temp + '°C';
        document.getElementById('cryo-moves').textContent = moves;
        document.getElementById('cryo-msg').textContent = '';
        document.getElementById('next-cryo').style.display = 'none';
        startTemp(); draw();
    };
    window.nextCryoLevel = function () {
        level++; document.getElementById('cryo-level').textContent = level;
        window.restartCryo();
    };

    // Cleanup
    window._cryoCleanup = function () {
        clearInterval(tempInterval);
        document.removeEventListener('keydown', handleKey);
    };

    initCanvas(); startTemp(); draw();
}

// ─────────────────────────────────────────────
//  GAME 2: PRESSURE DROP — Water Rising Dodge
// ─────────────────────────────────────────────
function buildPressureGame(container) {
    container.innerHTML = `
        ${gameHeader('PRESSURE DROP', '#FF3D71', '🌊')}
        <p class="text-text-secondary text-sm mb-4 font-mono">Use Arrow Keys / WASD or touch to move. Collect 🔧 valves to slow the water. Reach 🪜 (ladder) to escape each floor!</p>
        <div class="flex items-center gap-6 mb-4 font-mono text-sm flex-wrap">
            <span>Water: <strong id="pd-level" style="color:#FF3D71">0%</strong></span>
            <span>Score: <strong id="pd-score" style="color:#FFB800">0</strong></span>
            <span>Valves: <strong id="pd-valves" style="color:#00E5FF">0</strong></span>
            <span>Floor: <strong id="pd-floor" style="color:#00E5FF">1</strong></span>
        </div>
        <canvas id="pd-canvas" style="width:100%;max-width:540px;height:420px;display:block;margin:0 auto;border:1px solid rgba(255,61,113,0.3);border-radius:8px;cursor:pointer"></canvas>
        <div id="pd-msg" class="text-center mt-3 font-mono text-sm" style="color:#FF3D71;min-height:24px"></div>
        <div class="flex gap-3 justify-center mt-4">
            <button class="btn-g red" onclick="restartPD()">↺ Restart</button>
        </div>
    `;

    const C = document.getElementById('pd-canvas');
    C.width = 540; C.height = 420;
    const ctx = C.getContext('2d');

    const TILE = 36, COLS = 15, ROWS = 11;
    let waterLevel = 0, score = 0, valves = 0, floor = 1;
    let gameOver = false, won = false;
    let waterInterval = null, loop = null;

    // 0=empty,1=wall,2=ladder,3=valve,4=water
    let grid, playerPos, items;

    function makeGrid() {
        const g = [];
        for (let r = 0; r < ROWS; r++) {
            g.push(new Array(COLS).fill(0));
        }
        // Walls
        for (let c = 0; c < COLS; c++) { g[0][c] = 1; g[ROWS-1][c] = 1; }
        for (let r = 0; r < ROWS; r++) { g[r][0] = 1; g[r][COLS-1] = 1; }
        // Platforms
        for (let p = 0; p < 4; p++) {
            const r = 2 + p * 2;
            const start = 2 + Math.floor(Math.random() * 4);
            const len = 5 + Math.floor(Math.random() * 4);
            for (let c = start; c < Math.min(start+len, COLS-1); c++) g[r][c] = 1;
        }
        return g;
    }

    function spawnItems() {
        items = [];
        // Ladder (exit)
        items.push({ type:'ladder', x: COLS-3, y: 1 });
        // Valves
        for (let i = 0; i < 4; i++) {
            items.push({ type:'valve', x: 2 + Math.floor(Math.random()*(COLS-4)), y: 2 + Math.floor(Math.random()*(ROWS-3)) });
        }
    }

    function init() {
        waterLevel = 0; score = 0; valves = 0; gameOver = false; won = false;
        grid = makeGrid();
        playerPos = { x: 2, y: ROWS-2, vy: 0, onGround: false };
        spawnItems();
        document.getElementById('pd-level').textContent = '0%';
        document.getElementById('pd-score').textContent = '0';
        document.getElementById('pd-valves').textContent = '0';
        document.getElementById('pd-msg').textContent = '';
        startWater();
    }

    function startWater() {
        clearInterval(waterInterval);
        const rate = Math.max(500, 2000 - valves * 300 - (floor - 1) * 200);
        waterInterval = setInterval(() => {
            if (gameOver || won) return;
            waterLevel = Math.min(100, waterLevel + 5);
            document.getElementById('pd-level').textContent = waterLevel + '%';
            // Fill bottom with water
            const waterRow = Math.floor(ROWS - (waterLevel / 100) * (ROWS - 2));
            for (let r = ROWS-1; r >= waterRow; r--) {
                for (let c = 1; c < COLS-1; c++) {
                    if (grid[r][c] !== 1) grid[r][c] = 4;
                }
            }
            if (waterLevel >= 100) { gameOver = true; clearInterval(waterInterval); SoundEngine.gameDie(); draw(); }
        }, rate);
    }

    const keys = {};
    window._pdKey = function(e) { keys[e.code] = true; };
    window._pdKeyUp = function(e) { keys[e.code] = false; };
    document.addEventListener('keydown', window._pdKey);
    document.addEventListener('keyup', window._pdKeyUp);

    let lastTime = 0;
    function gameLoop(ts) {
        if (gameOver || won) { draw(); return; }
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        // Physics
        playerPos.vy += 30 * dt;
        let newY = playerPos.y + playerPos.vy * dt;
        let newX = playerPos.x;
        if (keys['ArrowLeft'] || keys['KeyA']) newX -= 8 * dt;
        if (keys['ArrowRight'] || keys['KeyD']) newX += 8 * dt;
        if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && playerPos.onGround) {
            playerPos.vy = -14; playerPos.onGround = false; SoundEngine.gameJump();
        }

        // Collision
        const px = Math.round(newX), py = Math.round(newY);
        playerPos.onGround = false;
        if (px >= 1 && px < COLS-1 && py >= 1 && py < ROWS-1) {
            if (grid[Math.round(newY+0.5)][px] === 1) { newY = Math.round(newY+0.5) - 0.5; playerPos.vy = 0; playerPos.onGround = true; }
        }
        newX = Math.max(1, Math.min(COLS-2, newX));
        newY = Math.max(1, Math.min(ROWS-2, newY));
        playerPos.x = newX; playerPos.y = newY;

        // Water death
        const gr = Math.round(playerPos.y);
        if (gr >= 0 && gr < ROWS && grid[gr][Math.round(playerPos.x)] === 4) {
            gameOver = true; clearInterval(waterInterval); SoundEngine.gameDie();
        }

        // Item collection
        items.forEach((item, i) => {
            if (!item.collected) {
                const dx = Math.abs(playerPos.x - item.x);
                const dy = Math.abs(playerPos.y - item.y);
                if (dx < 1.2 && dy < 1.2) {
                    if (item.type === 'valve') {
                        item.collected = true; valves++; score += 100;
                        document.getElementById('pd-valves').textContent = valves;
                        document.getElementById('pd-score').textContent = score;
                        SoundEngine.gameCollect();
                        clearInterval(waterInterval); startWater();
                    }
                    if (item.type === 'ladder') {
                        won = true; floor++;
                        score += 500; document.getElementById('pd-score').textContent = score;
                        document.getElementById('pd-floor').textContent = floor;
                        document.getElementById('pd-msg').textContent = `Floor ${floor}! Escaped! Score: ${score}`;
                        clearInterval(waterInterval); SoundEngine.gameWin();
                        setTimeout(() => { won = false; init(); }, 2000);
                    }
                }
            }
        });

        score++;
        if (ts % 60 < 2) document.getElementById('pd-score').textContent = score;
        draw();
        loop = requestAnimationFrame(gameLoop);
    }

    function draw() {
        ctx.fillStyle = '#04070F';
        ctx.fillRect(0, 0, C.width, C.height);

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = c * TILE, y = r * TILE;
                const cell = grid[r][c];
                if (cell === 1) { // Wall
                    ctx.fillStyle = '#1A2438';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#2A3A52';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, TILE, TILE);
                } else if (cell === 4) { // Water
                    const alpha = 0.7 + 0.3 * Math.sin(Date.now() / 200 + c * 0.5);
                    ctx.fillStyle = `rgba(0,100,255,${alpha})`;
                    ctx.fillRect(x, y, TILE, TILE);
                    // Ripple
                    ctx.fillStyle = `rgba(100,180,255,${alpha*0.4})`;
                    ctx.fillRect(x, y, TILE, 4);
                }
            }
        }

        // Items
        items.forEach(item => {
            if (item.collected) return;
            const x = item.x * TILE, y = item.y * TILE;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            const bounce = Math.sin(Date.now() / 400 + item.x) * 3;
            ctx.fillText(item.type === 'ladder' ? '🪜' : '🔧', x + TILE/2, y + TILE/2 + bounce + 7);
        });

        // Player
        const px = playerPos.x * TILE, py = playerPos.y * TILE;
        ctx.beginPath();
        ctx.arc(px + TILE/2, py + TILE/2, TILE/2 - 4, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,229,255,0.2)';
        ctx.fill();
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🧑', px + TILE/2, py + TILE/2 + 8);

        // Water level UI
        const barH = C.height * (waterLevel / 100);
        ctx.fillStyle = `rgba(255,61,113,${0.1 + waterLevel/200})`;
        ctx.fillRect(C.width - 8, C.height - barH, 8, barH);

        if (gameOver) {
            ctx.fillStyle = 'rgba(4,7,15,0.88)'; ctx.fillRect(0,0,C.width,C.height);
            ctx.fillStyle = '#FF3D71'; ctx.font = 'bold 36px Orbitron,sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('DROWNED! 💀', C.width/2, C.height/2 - 10);
            ctx.fillStyle = '#8A96A8'; ctx.font = '14px JetBrains Mono,monospace';
            ctx.fillText('Score: ' + score, C.width/2, C.height/2 + 30);
        }
    }

    // Touch support
    let touchX = null;
    C.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; e.preventDefault(); }, { passive: false });
    C.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - touchX;
        if (dx > 10) keys['ArrowRight'] = true;
        else if (dx < -10) keys['ArrowLeft'] = true;
        e.preventDefault();
    }, { passive: false });
    C.addEventListener('touchend', e => {
        keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
        keys['Space'] = true; setTimeout(() => { keys['Space'] = false; }, 100);
        e.preventDefault();
    }, { passive: false });

    // Click to jump
    C.addEventListener('click', () => { keys['Space'] = true; setTimeout(() => { keys['Space'] = false; }, 100); });

    window.restartPD = function () {
        clearInterval(waterInterval);
        cancelAnimationFrame(loop);
        floor = 1;
        document.getElementById('pd-floor').textContent = floor;
        init();
        loop = requestAnimationFrame(gameLoop);
    };

    window._pdCleanup = function () {
        clearInterval(waterInterval);
        cancelAnimationFrame(loop);
        document.removeEventListener('keydown', window._pdKey);
        document.removeEventListener('keyup', window._pdKeyUp);
    };

    init();
    loop = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────
//  GAME 3: BLACKOUT PROTOCOL — Dark Maze
// ─────────────────────────────────────────────
function buildBlackoutGame(container) {
    container.innerHTML = `
        ${gameHeader('BLACKOUT PROTOCOL', '#FFB800', '🕶️')}
        <p class="text-text-secondary text-sm mb-4 font-mono">Total darkness — your flashlight reveals only a small area. Navigate with WASD/Arrows. Find all 🔑 keys then reach 🚪 EXIT.</p>
        <div class="flex items-center gap-6 mb-4 font-mono text-sm flex-wrap">
            <span>Keys: <strong id="bl-keys" style="color:#FFB800">0/3</strong></span>
            <span>Score: <strong id="bl-score" style="color:#00E5FF">0</strong></span>
            <span>Battery: <strong id="bl-bat" style="color:#FFB800">100%</strong></span>
            <span>Level: <strong id="bl-level" style="color:#FF3D71">1</strong></span>
        </div>
        <canvas id="bl-canvas" style="width:100%;max-width:540px;height:400px;display:block;margin:0 auto;border:1px solid rgba(255,184,0,0.3);border-radius:8px;cursor:pointer;background:#000"></canvas>
        <div id="bl-msg" class="text-center mt-3 font-mono text-sm" style="color:#FFB800;min-height:24px"></div>
        <div class="flex gap-3 justify-center mt-4">
            <button class="btn-g amber" onclick="restartBL()">↺ Restart</button>
        </div>
    `;

    const C = document.getElementById('bl-canvas');
    C.width = 540; C.height = 400;
    const ctx = C.getContext('2d');

    const TILE = 36, COLS = 15, ROWS = 11;
    let keysFound = 0, score = 0, battery = 100, level = 1;
    let gameOver = false, won = false;
    let batInterval = null, loop = null;

    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    let playerPos, items;

    function init() {
        keysFound = 0; score = 0; battery = 100; gameOver = false; won = false;
        playerPos = { x: 1, y: 1 };
        items = [
            { type: 'key', x: 3, y: 3, found: false },
            { type: 'key', x: 11, y: 5, found: false },
            { type: 'key', x: 7, y: 8, found: false },
            { type: 'battery', x: 5, y: 7, found: false },
            { type: 'battery', x: 12, y: 3, found: false },
            { type: 'exit', x: 13, y: 9, found: false },
            { type: 'trap', x: 5, y: 5 },
            { type: 'trap', x: 9, y: 3 },
        ];
        document.getElementById('bl-keys').textContent = '0/3';
        document.getElementById('bl-score').textContent = '0';
        document.getElementById('bl-bat').textContent = '100%';
        document.getElementById('bl-msg').textContent = '';
        startBat();
    }

    function startBat() {
        clearInterval(batInterval);
        batInterval = setInterval(() => {
            if (gameOver || won) return;
            battery = Math.max(0, battery - 2);
            const el = document.getElementById('bl-bat');
            if (el) { el.textContent = battery + '%'; el.style.color = battery < 30 ? '#FF3D71' : '#FFB800'; }
            if (battery <= 0) { gameOver = true; SoundEngine.gameDie(); clearInterval(batInterval); draw(); }
        }, 1500);
    }

    const keys = {};
    let moveCD = 0;
    window._blKey = function(e) {
        keys[e.code] = true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
    };
    window._blKeyUp = function(e) { keys[e.code] = false; };
    document.addEventListener('keydown', window._blKey);
    document.addEventListener('keyup', window._blKeyUp);

    function tryMove(dx, dy) {
        if (gameOver || won) return;
        const nx = playerPos.x + dx, ny = playerPos.y + dy;
        if (nx < 0||nx>=COLS||ny<0||ny>=ROWS||maze[ny][nx]===1) return;
        playerPos.x = nx; playerPos.y = ny;
        score++;
        document.getElementById('bl-score').textContent = score;
        SoundEngine.gameJump();

        // Check items
        items.forEach(item => {
            if (item.found || item.type === 'exit') return;
            if (item.x === nx && item.y === ny) {
                item.found = true;
                if (item.type === 'key') { keysFound++; document.getElementById('bl-keys').textContent = keysFound+'/3'; SoundEngine.gameCollect(); score += 200; }
                if (item.type === 'battery') { battery = Math.min(100, battery + 40); SoundEngine.gameCollect(); }
                if (item.type === 'trap') { battery = Math.max(0, battery - 35); SoundEngine.error(); }
            }
        });

        // Exit check
        const exitItem = items.find(i => i.type === 'exit');
        if (exitItem && nx === exitItem.x && ny === exitItem.y) {
            if (keysFound >= 3) { won = true; clearInterval(batInterval); SoundEngine.gameWin(); document.getElementById('bl-msg').textContent = `Level ${level} complete! Score: ${score}`; }
            else { document.getElementById('bl-msg').textContent = `Need ${3-keysFound} more key(s)!`; SoundEngine.error(); }
        }
    }

    let lastTime = 0;
    function gameLoop(ts) {
        if (gameOver || won) { draw(); return; }
        if (ts - lastTime > 120) {
            lastTime = ts;
            if (keys['ArrowLeft']||keys['KeyA']) tryMove(-1,0);
            else if (keys['ArrowRight']||keys['KeyD']) tryMove(1,0);
            else if (keys['ArrowUp']||keys['KeyW']) tryMove(0,-1);
            else if (keys['ArrowDown']||keys['KeyS']) tryMove(0,1);
        }
        draw();
        loop = requestAnimationFrame(gameLoop);
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, C.width, C.height);

        // Flashlight radius
        const batRatio = battery / 100;
        const lightR = 80 + batRatio * 80;
        const cx = (playerPos.x + 0.5) * TILE, cy = (playerPos.y + 0.5) * TILE;

        // Draw maze & items only in light cone
        ctx.save();
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, lightR);
        gradient.addColorStop(0, 'rgba(255,220,150,0.9)');
        gradient.addColorStop(0.5, 'rgba(255,200,80,0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        // Clip to visible area
        ctx.beginPath(); ctx.arc(cx, cy, lightR, 0, Math.PI*2); ctx.clip();

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = c * TILE, y = r * TILE;
                if (maze[r][c] === 1) {
                    ctx.fillStyle = '#1A2438';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#0A1020';
                    ctx.lineWidth = 1; ctx.strokeRect(x, y, TILE, TILE);
                } else {
                    ctx.fillStyle = '#060A14';
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }

        // Items
        items.forEach(item => {
            if (item.found && item.type !== 'exit' && item.type !== 'trap') return;
            const x = item.x * TILE, y = item.y * TILE;
            ctx.font = '18px Arial'; ctx.textAlign = 'center';
            const emojis = { key:'🔑', battery:'🔋', exit:'🚪', trap:'⚠️' };
            ctx.fillText(emojis[item.type] || '?', x + TILE/2, y + TILE/2 + 7);
        });

        // Light overlay
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, C.width, C.height);
        ctx.restore();

        // Player
        ctx.beginPath(); ctx.arc(cx, cy, TILE/2 - 5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,220,80,0.3)'; ctx.fill();
        ctx.font = '20px Arial'; ctx.textAlign = 'center';
        ctx.fillText('🧑', cx, cy + 7);

        // Darkness vignette
        const vign = ctx.createRadialGradient(cx, cy, lightR*0.7, cx, cy, lightR*1.3);
        vign.addColorStop(0, 'rgba(0,0,0,0)');
        vign.addColorStop(1, 'rgba(0,0,0,0.98)');
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, C.width, C.height);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0,0,C.width,C.height);
            ctx.fillStyle = '#FF3D71'; ctx.font = 'bold 32px Orbitron,sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('BATTERY DEAD! 🔦', C.width/2, C.height/2 - 10);
            ctx.fillStyle = '#8A96A8'; ctx.font = '14px JetBrains Mono'; ctx.fillText('Score: '+score, C.width/2, C.height/2+30);
        }
        if (won) {
            ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0,0,C.width,C.height);
            ctx.fillStyle = '#FFB800'; ctx.font = 'bold 32px Orbitron,sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('ESCAPED! 🎉', C.width/2, C.height/2-10);
            ctx.fillStyle = '#00E5FF'; ctx.font = '14px JetBrains Mono'; ctx.fillText('Score: '+score, C.width/2, C.height/2+30);
        }
    }

    C.addEventListener('click', e => {
        const rect = C.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / (rect.width / C.width);
        const cy = (e.clientY - rect.top) / (rect.height / C.height);
        const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
        const dx = tx - playerPos.x, dy = ty - playerPos.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) tryMove(dx, dy);
    });

    window.restartBL = function () {
        clearInterval(batInterval); cancelAnimationFrame(loop);
        init(); loop = requestAnimationFrame(gameLoop);
    };
    window._blCleanup = function () {
        clearInterval(batInterval); cancelAnimationFrame(loop);
        document.removeEventListener('keydown', window._blKey);
        document.removeEventListener('keyup', window._blKeyUp);
    };

    init();
    loop = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────
//  GAME 4: FRACTURE ZONE — Platform Survival
// ─────────────────────────────────────────────
function buildFractureGame(container) {
    container.innerHTML = `
        ${gameHeader('FRACTURE ZONE', '#00E5FF', '⚡')}
        <p class="text-text-secondary text-sm mb-4 font-mono">Jump between tiles before they crack and fall! Collect ⭐ for points. Press Space/Up/W to jump. A/D or Arrows to move. Don't fall!</p>
        <div class="flex items-center gap-6 mb-4 font-mono text-sm flex-wrap">
            <span>Score: <strong id="fz-score" style="color:#00E5FF">0</strong></span>
            <span>Lives: <strong id="fz-lives" style="color:#FF3D71">❤️❤️❤️</strong></span>
            <span>Level: <strong id="fz-level" style="color:#FFB800">1</strong></span>
            <span>Combo: <strong id="fz-combo" style="color:#FFB800">x1</strong></span>
        </div>
        <canvas id="fz-canvas" style="width:100%;max-width:560px;height:420px;display:block;margin:0 auto;border:1px solid rgba(0,229,255,0.2);border-radius:8px;background:#04070F;cursor:pointer"></canvas>
        <div id="fz-msg" class="text-center mt-3 font-mono text-sm" style="color:#00E5FF;min-height:24px"></div>
        <div class="flex gap-3 justify-center mt-4">
            <button class="btn-g" onclick="restartFZ()">↺ Restart</button>
        </div>
    `;

    const C = document.getElementById('fz-canvas');
    C.width = 560; C.height = 420;
    const ctx = C.getContext('2d');

    const TILE = 56;
    const COLS = 10, PLATFORMS = 6;
    let score = 0, lives = 3, level = 1, combo = 1;
    let gameOver = false;
    let loop = null;

    let tiles = [], player, stars = [], particles = [];

    function makeTiles() {
        tiles = [];
        for (let r = 0; r < PLATFORMS; r++) {
            for (let c = 0; c < COLS; c++) {
                // Skip some tiles to create gaps
                if (Math.random() > 0.7) continue;
                tiles.push({
                    x: c * TILE, y: 60 + r * 60,
                    w: TILE - 4, h: 16,
                    health: 3, // 3=solid, 2=cracked, 1=crumbling, 0=fallen
                    timer: 0,
                    fallTimer: null,
                    falling: false, fallenY: 0,
                    alpha: 1,
                    col: c, row: r,
                });
            }
        }
        // Always add solid ground-ish platform cluster at bottom
        for (let c = 2; c < 8; c++) {
            tiles.push({ x:c*TILE, y:380, w:TILE-4, h:16, health:4, timer:0, falling:false, fallenY:0, alpha:1 });
        }
    }

    function spawnStars() {
        stars = [];
        for (let i = 0; i < 5 + level; i++) {
            stars.push({ x:40 + Math.random()*(C.width-80), y:50 + Math.random()*300, collected:false });
        }
    }

    function initGame() {
        score = 0; lives = 3; level = 1; combo = 1; gameOver = false;
        player = { x:C.width/2-14, y:300, w:28, h:36, vx:0, vy:0, onGround:false, facing:1 };
        makeTiles(); spawnStars();
        document.getElementById('fz-score').textContent = '0';
        document.getElementById('fz-lives').textContent = '❤️'.repeat(lives);
        document.getElementById('fz-level').textContent = level;
        document.getElementById('fz-combo').textContent = 'x1';
        document.getElementById('fz-msg').textContent = '';
    }

    const keys = {};
    window._fzKey = function(e) { keys[e.code] = true; if(['Space','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); };
    window._fzKeyUp = function(e) { keys[e.code] = false; };
    document.addEventListener('keydown', window._fzKey);
    document.addEventListener('keyup', window._fzKeyUp);

    let lastTime = 0, fracTimer = 0;

    function emitParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            particles.push({ x, y, vx:(Math.random()-0.5)*6, vy:-Math.random()*5-2, alpha:1, color, size:3+Math.random()*3 });
        }
    }

    function gameLoop(ts) {
        if (gameOver) { draw(); return; }
        const dt = Math.min((ts-lastTime)/1000, 0.05);
        lastTime = ts;
        fracTimer += dt;

        // Controls
        if (keys['ArrowLeft']||keys['KeyA']) { player.vx = -220; player.facing = -1; }
        else if (keys['ArrowRight']||keys['KeyD']) { player.vx = 220; player.facing = 1; }
        else player.vx *= 0.8;

        if ((keys['Space']||keys['ArrowUp']||keys['KeyW']) && player.onGround) {
            player.vy = -420; player.onGround = false; SoundEngine.gameJump();
        }

        player.vy += 900 * dt;
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        player.x = Math.max(0, Math.min(C.width - player.w, player.x));

        // Tile collision
        player.onGround = false;
        tiles.forEach(t => {
            if (t.health <= 0 || t.falling) return;
            const overlapX = player.x + player.w > t.x && player.x < t.x + t.w;
            const falling = player.vy >= 0;
            const prevBottom = player.y + player.h - player.vy * dt;
            if (overlapX && falling && prevBottom <= t.y + t.h && player.y + player.h >= t.y) {
                player.y = t.y - player.h;
                player.vy = 0;
                player.onGround = true;
                // Step on tile — start fracturing
                if (t.health > 0 && !t.stepping) {
                    t.stepping = true;
                    if (t.health === 3) {
                        t.health = 2;
                        setTimeout(() => { if (t.health === 2) { t.health = 1; setTimeout(() => { if (t.health === 1) { t.health = 0; t.falling = true; emitParticles(t.x+t.w/2, t.y, '#00E5FF'); SoundEngine.gameFall(); } }, 600); } }, 600);
                    }
                }
            }
        });

        // Occasional random fractures
        if (fracTimer > Math.max(1.5, 4 - level * 0.3)) {
            fracTimer = 0;
            const safe = tiles.filter(t => t.health === 3);
            if (safe.length > 0) {
                const t = safe[Math.floor(Math.random() * safe.length)];
                t.health = 2;
                setTimeout(() => { if(t.health===2) { t.health=1; setTimeout(()=>{ if(t.health===1){t.health=0;t.falling=true;emitParticles(t.x+t.w/2,t.y,'#FF3D71');} },800); } },600);
            }
        }

        // Falling tiles
        tiles.forEach(t => { if (t.falling) { t.fallenY += 300 * dt; t.alpha = Math.max(0, t.alpha - 2*dt); } });

        // Fall off screen
        if (player.y > C.height + 10) {
            lives--; combo = 1;
            document.getElementById('fz-lives').textContent = '❤️'.repeat(Math.max(0,lives)) + '🖤'.repeat(Math.max(0, 3-lives));
            document.getElementById('fz-combo').textContent = 'x1';
            SoundEngine.gameDie();
            if (lives <= 0) { gameOver = true; draw(); return; }
            player.x = C.width/2-14; player.y = 100; player.vy = 0;
            makeTiles(); spawnStars();
        }

        // Stars
        stars.forEach(s => {
            if (s.collected) return;
            if (player.x < s.x+16 && player.x+player.w > s.x && player.y < s.y+16 && player.y+player.h > s.y) {
                s.collected = true;
                score += 50 * combo; combo++;
                document.getElementById('fz-score').textContent = score;
                document.getElementById('fz-combo').textContent = 'x'+combo;
                emitParticles(s.x, s.y, '#FFD700');
                SoundEngine.gameCollect();
            }
        });

        // Level up
        if (stars.every(s => s.collected)) {
            level++; combo = 1;
            document.getElementById('fz-level').textContent = level;
            document.getElementById('fz-combo').textContent = 'x1';
            document.getElementById('fz-msg').textContent = `Level ${level}! Platforms fracture faster!`;
            SoundEngine.success();
            makeTiles(); spawnStars();
        }

        // Particles
        particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=20*dt; p.alpha=Math.max(0,p.alpha-2*dt); });
        particles = particles.filter(p => p.alpha > 0);

        draw();
        loop = requestAnimationFrame(gameLoop);
    }

    function draw() {
        ctx.fillStyle = '#04070F';
        ctx.fillRect(0, 0, C.width, C.height);

        // Background grid
        ctx.strokeStyle = 'rgba(0,229,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < C.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,C.height); ctx.stroke(); }
        for (let y = 0; y < C.height; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(C.width,y); ctx.stroke(); }

        // Tiles
        tiles.forEach(t => {
            if (t.alpha <= 0) return;
            const drawY = t.y + (t.falling ? t.fallenY : 0);
            ctx.save();
            ctx.globalAlpha = t.alpha;
            const colors = { 4:'#1A4A6A', 3:'#0A3A5C', 2:'#4A2810', 1:'#6A2010' };
            const borders = { 4:'#00AAFF', 3:'#00E5FF', 2:'#FFB800', 1:'#FF3D71' };
            ctx.fillStyle = colors[t.health] || '#111';
            ctx.fillRect(t.x, drawY, t.w, t.h);
            ctx.strokeStyle = borders[t.health] || '#333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(t.x, drawY, t.w, t.h);
            // Crack lines
            if (t.health === 2) {
                ctx.strokeStyle = 'rgba(255,184,0,0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(t.x+8,drawY+4); ctx.lineTo(t.x+t.w-8,drawY+t.h-4); ctx.stroke();
            }
            if (t.health === 1) {
                ctx.strokeStyle = 'rgba(255,61,113,0.7)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(t.x+5,drawY+3); ctx.lineTo(t.x+t.w-5,drawY+t.h-3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(t.x+t.w-5,drawY+3); ctx.lineTo(t.x+5,drawY+t.h-3); ctx.stroke();
            }
            ctx.restore();
        });

        // Stars
        const starPulse = Math.sin(Date.now()/300)*3;
        stars.forEach(s => {
            if (s.collected) return;
            ctx.font = '20px Arial'; ctx.textAlign = 'center';
            ctx.fillText('⭐', s.x + 8, s.y + starPulse + 14);
            // Glow
            const g = ctx.createRadialGradient(s.x+8,s.y+8,0,s.x+8,s.y+8,20);
            g.addColorStop(0,'rgba(255,215,0,0.3)'); g.addColorStop(1,'rgba(255,215,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x+8,s.y+8,20,0,Math.PI*2); ctx.fill();
        });

        // Player
        const px = player.x, py = player.y;
        // Shadow
        ctx.fillStyle = 'rgba(0,229,255,0.15)';
        ctx.ellipse(px+player.w/2, py+player.h+2, player.w/2, 4, 0, 0, Math.PI*2);
        ctx.fill();
        // Body
        ctx.beginPath();
        ctx.arc(px+player.w/2, py+player.h/2, player.w/2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,229,255,0.2)'; ctx.fill();
        ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '24px Arial'; ctx.textAlign = 'center';
        ctx.fillText('🧑', px+player.w/2, py+player.h/2+9);

        // Particles
        particles.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fillStyle = p.color.replace(')', `,${p.alpha})`).replace('rgb', 'rgba');
            ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1;
        });

        if (gameOver) {
            ctx.fillStyle = 'rgba(4,7,15,0.9)'; ctx.fillRect(0,0,C.width,C.height);
            ctx.fillStyle = '#FF3D71'; ctx.font = 'bold 36px Orbitron,sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('FELL INTO THE VOID!', C.width/2, C.height/2 - 15);
            ctx.fillStyle = '#FFB800'; ctx.font = '16px JetBrains Mono';
            ctx.fillText('Score: '+score+'  Level: '+level, C.width/2, C.height/2 + 25);
            ctx.fillStyle = '#8A96A8'; ctx.font = '13px JetBrains Mono';
            ctx.fillText('Press Restart to try again', C.width/2, C.height/2 + 55);
        }
    }

    C.addEventListener('click', e => {
        const rect = C.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / (rect.width / C.width);
        if (cx < C.width/2) keys['ArrowLeft'] = true;
        else keys['ArrowRight'] = true;
        keys['Space'] = true;
        setTimeout(() => { keys['ArrowLeft'] = false; keys['ArrowRight'] = false; keys['Space'] = false; }, 150);
    });

    window.restartFZ = function () {
        cancelAnimationFrame(loop);
        initGame();
        loop = requestAnimationFrame(gameLoop);
    };
    window._fzCleanup = function () {
        cancelAnimationFrame(loop);
        document.removeEventListener('keydown', window._fzKey);
        document.removeEventListener('keyup', window._fzKeyUp);
    };

    initGame();
    loop = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────
//  STOP GAME — cleanup
// ─────────────────────────────────────────────
function stopGame(name) {
    const cleanups = {
        cryogenic: window._cryoCleanup,
        pressure: window._pdCleanup,
        blackout: window._blCleanup,
        fracture: window._fzCleanup,
    };
    if (cleanups[name]) { try { cleanups[name](); } catch(e) {} }
}

// ─────────────────────────────────────────────
//  HOVER SOUNDS ON CARDS & LINKS
// ─────────────────────────────────────────────
function initHoverSounds() {
    document.querySelectorAll('.game-card, button, a, .filter-btn').forEach(el => {
        el.addEventListener('mouseenter', () => SoundEngine.hover());
    });
}

// ─────────────────────────────────────────────
//  INIT ALL
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ParticleSystem.init();
    initScrollProgress();
    initNavbar();
    initMobileMenu();
    initFadeIn();
    initRipple();
    initCountdown();
    initStatCounters();
    initLeaderboard();
    initSoundToggle();
    initTyping();
    initNewsletter();
    initModal();
    initHoverSounds();
});
