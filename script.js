/**
 * KONFIGURASI & STATE
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Warna Pastel
const COLORS = {
    bg: '#2a2a3e',
    lane: '#3b3b54',
    player: '#7afcff', // Cyan Neon
    playerShadow: '#4da8aa',
    obstacleBlock: '#ff7eb3', // Pink
    obstacleSpike: '#ff6b6b', // Redish
    coin: '#ffe66d', // Yellow
    obstacleHigh: '#a8e6cf', // Mint for high obstacle
    particle: '#ffffff'
};

// Game State
let state = 'MENU'; // MENU, PLAYING, GAMEOVER, PAUSED
let frames = 0;
let score = 0;
let coins = 0;
let speed = 5;
let baseSpeed = 5;
let speedMultiplier = 1;

const HIGH_SCORE_KEY = 'aespoRunnerHighScore';
// Character Selection
// DAFTAR KARAKTER: Ganti nama file di bawah ini sesuai isi folder 'img' Anda
const CHAR_FILES = ['kat.jpg', 'ning.jpg', 'sel.jpg', 'winter.jpg']; 
const CHAR_COLORS = ['#7afcff', '#ff7eb3', '#ffe66d', '#a8e6cf'];
const CHAR_IMAGES = [];
let selectedCharIndex = 0;

// Music Selection
// DAFTAR MUSIK: Ganti nama file di bawah ini sesuai isi folder 'music' Anda
const MUSIC_FILES = ['drama.mp3', 'arma.mp3', 'whip.mp3'];
let selectedMusicIndex = 0;
let bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = 0.6; // Volume dinaikkan agar lebih terdengar

function changeMusic(dir) {
    if (MUSIC_FILES.length === 0) return;
    selectedMusicIndex += dir;
    if (selectedMusicIndex < 0) selectedMusicIndex = MUSIC_FILES.length - 1;
    if (selectedMusicIndex >= MUSIC_FILES.length) selectedMusicIndex = 0;
    document.getElementById('musicLabel').innerText = MUSIC_FILES[selectedMusicIndex];
}

function preloadCharacters() {
    CHAR_FILES.forEach(file => {
        const img = new Image();
        img.src = 'img/' + file;
        CHAR_IMAGES.push(img);
    });
    updateCharPreview();
    player.color = CHAR_COLORS[0];
    
    // Init Music Label
    if (MUSIC_FILES.length > 0) document.getElementById('musicLabel').innerText = MUSIC_FILES[0];
    updateHighScoreDisplay();
}

function changeCharacter(dir) {
    if (CHAR_IMAGES.length === 0) return;
    selectedCharIndex += dir;
    if (selectedCharIndex < 0) selectedCharIndex = CHAR_IMAGES.length - 1;
    if (selectedCharIndex >= CHAR_IMAGES.length) selectedCharIndex = 0;
    updateCharPreview();
    player.color = CHAR_COLORS[selectedCharIndex % CHAR_COLORS.length];
}

function updateCharPreview() {
    const preview = document.getElementById('charPreview');
    if (CHAR_IMAGES[selectedCharIndex]) {
        preview.src = CHAR_IMAGES[selectedCharIndex].src;
    }
}

function updateHighScoreDisplay() {
    const highScore = localStorage.getItem(HIGH_SCORE_KEY) || 0;
    document.getElementById('highScoreVal').innerText = highScore;
}

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

/**
 * AUDIO SYNTHESIZER (Tanpa file eksternal)
 */
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'coin') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1800, now + 0.05);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

/**
 * ENTITAS
 */
// Lanes: 0 (Kiri), 1 (Tengah), 2 (Kanan)
const LANE_WIDTH = canvas.width / 3;
const LANES = [LANE_WIDTH / 2, canvas.width / 2, LANE_WIDTH * 2.5];

const player = {
    lane: 1,
    x: LANES[1],
    y: 500,
    width: 40,
    height: 40,
    color: COLORS.player,
    
    update: function() {
        // Smooth lane transition
        const targetX = LANES[this.lane];
        this.x += (targetX - this.x) * 0.2;
    },

    draw: function() {
        // Draw Shadow (tetap di tanah)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 20, this.width/2, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Character (naik saat lompat)
        const drawY = this.y;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        const h = 50; 
        const img = CHAR_IMAGES[selectedCharIndex];
        if (img && img.complete && img.naturalWidth !== 0) {
            // Draw Image jika berhasil dimuat
            ctx.drawImage(img, this.x - 25, drawY - (h - 20), 50, h);
        } else {
            // Fallback: Bentuk Chibi sederhana (Bulat + Badan)
            ctx.beginPath();
            ctx.arc(this.x, drawY - 10, 15, 0, Math.PI * 2); // Kepala
            ctx.fill();
            ctx.fillRect(this.x - 15, drawY, 30, 25); // Badan
            
            // Mata
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(this.x - 5, drawY - 10, 3, 0, Math.PI * 2);
            ctx.arc(this.x + 5, drawY - 10, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    
    move: function(dir) {
        if (dir === -1 && this.lane > 0) this.lane--;
        if (dir === 1 && this.lane < 2) this.lane++;
    }
};

let obstacles = [];
let particles = [];
let bgStars = [];

class Obstacle {
    constructor() {
        this.lane = Math.floor(Math.random() * 3);
        this.x = LANES[this.lane];
        this.y = -100;
        
        // Logika Probabilitas Rintangan (Lebih menantang)
        let rand = Math.random();
        if (rand > 0.70) {
            this.type = 'coin';   // 30% Koin (Lebih sering muncul)
        } else if (rand > 0.45) {
            this.type = 'block';  // 30% Block (Harus pindah jalur)
        } else if (rand > 0.20) {
            this.type = 'high';   // 30% High (Harus slide)
        } else {
            this.type = 'spike';  // 25% Spike (Lompat)
        }
        
        this.width = 40;
        this.height = 40;
        this.active = true;
    }

    update() {
        this.y += speed;
        if (this.y > canvas.height + 50) this.active = false;
    }

    draw() {
        if (!this.active) return;
        
        if (this.type === 'coin') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = COLORS.coin;
            ctx.fillStyle = COLORS.coin;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
            ctx.fill();
            // Inner detail
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText('$', this.x - 3, this.y + 4);
        } else if (this.type === 'block') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.obstacleBlock;
            ctx.fillStyle = COLORS.obstacleBlock;
            ctx.fillRect(this.x - 20, this.y - 40, 40, 40); // Tall block
            // Detail
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(this.x - 15, this.y - 35, 10, 10);
        } else if (this.type === 'spike') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.obstacleSpike;
            ctx.fillStyle = COLORS.obstacleSpike;
            ctx.beginPath();
            ctx.moveTo(this.x - 20, this.y);
            ctx.lineTo(this.x, this.y - 30);
            ctx.lineTo(this.x + 20, this.y);
            ctx.fill();
        } else if (this.type === 'high') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.obstacleHigh;
            ctx.fillStyle = COLORS.obstacleHigh;
            ctx.fillRect(this.x - 20, this.y - 60, 40, 30); // Floating bar
            ctx.fillRect(this.x - 2, this.y - 60, 4, 60); // Pole
        }
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function initBackground() {
    bgStars = [];
    for(let i=0; i<50; i++) {
        bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

/**
 * GAME LOOP
 */
function startGame() {
    state = 'PLAYING';
    score = 0;
    coins = 0;
    speed = baseSpeed;
    frames = 0;
    obstacles = [];
    particles = [];
    player.lane = 1;
    player.x = LANES[1];
    
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('score-hud').classList.remove('hidden');
    
    // Resume Audio Context (Penting agar SFX bunyi di Chrome/Edge)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Play Music
    if (MUSIC_FILES.length > 0) {
        const musicPath = 'music/' + MUSIC_FILES[selectedMusicIndex];
        // Cek apakah lagu sama agar tidak reload (cegah lag)
        if (bgmAudio.src.indexOf(musicPath) === -1 || !bgmAudio.src) {
            bgmAudio.src = musicPath;
        }
        bgmAudio.play().catch(e => console.log("Music play failed:", e));
    }

    initBackground();
    loop();
}

function resetGame() {
    startGame();
}

function pauseGame() {
    if (state === 'PLAYING') {
        state = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
        bgmAudio.pause();
    }
}

function resumeGame() {
    if (state === 'PAUSED') {
        state = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
        bgmAudio.play().catch(e => console.log(e));
        loop();
    }
}

function exitToMenu() {
    state = 'MENU';
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('score-hud').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    
    updateHighScoreDisplay();
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    
    // Bersihkan layar
    obstacles = [];
    particles = [];
    draw(); 
}

function gameOver() {
    state = 'GAMEOVER';
    playSound('hit');

    const finalScore = Math.floor(score);
    const highScore = localStorage.getItem(HIGH_SCORE_KEY) || 0;

    document.getElementById('finalScore').innerText = finalScore;
    document.getElementById('gameOverHighScoreVal').innerText = highScore;

    if (finalScore > highScore) {
        localStorage.setItem(HIGH_SCORE_KEY, finalScore);
        document.getElementById('newHighScoreMsg').classList.remove('hidden');
        document.getElementById('gameOverHighScoreVal').innerText = finalScore; // Update it immediately
    } else {
        document.getElementById('newHighScoreMsg').classList.add('hidden');
    }

    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('score-hud').classList.add('hidden');
    
    // Stop Music
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
}

function update() {
    // Difficulty scaling
    // Tempo game akan bertambah cepat seiring waktu.
    // Anda bisa mengubah angka di bawah ini untuk mengatur seberapa cepat akselerasinya.
    speed += 0.005; // Dipercepat (sebelumnya 0.0025)
    score += 0.1;

    // Background Parallax
    bgStars.forEach(star => {
        star.y += star.speed + (speed * 0.1);
        if (star.y > canvas.height) star.y = 0;
    });

    player.update();

    // Spawn Obstacles
    // Interval spawn makin rapat seiring kecepatan naik
    let spawnRate = Math.max(15, Math.floor(50 - speed * 1.5));
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle());
    }

    // Update Obstacles & Collision
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update();

        // Collision Logic

        // Cek Lane yang sama
        if (obs.lane === player.lane) {
            // Hitbox sederhana
            if (obs.y > player.y - 40 && obs.y < player.y + 20) {
                
                if (obs.type === 'coin') {
                    // Collect Coin
                    coins++;
                    score += 50;
                    playSound('coin');
                    createParticles(obs.x, obs.y, COLORS.coin, 10);
                    obs.active = false;
                } else {
                    // Semua obstacle lain mematikan
                    gameOver();
                }
            }
        }

        if (!obs.active) obstacles.splice(i, 1);
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    frames++;
}

function draw() {
    // Clear & BG
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars/Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    bgStars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
        ctx.fill();
    });

    // Draw Lanes (Visual Guide)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    LANES.forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    });

    // Draw Entities
    obstacles.forEach(obs => obs.draw());
    player.draw();
    particles.forEach(p => p.draw());

    // Update UI
    document.getElementById('scoreVal').innerText = Math.floor(score);
    document.getElementById('coinVal').innerText = coins;
}

function loop() {
    if (state === 'PLAYING') {
        update();
        draw();
        requestAnimationFrame(loop);
    }
}

/**
 * INPUT HANDLING
 */
window.addEventListener('keydown', (e) => {
    if (state !== 'PLAYING') return;

    if (e.key === 'ArrowLeft') player.move(-1);
    if (e.key === 'ArrowRight') player.move(1);
});

// Touch support for mobile
let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});
canvas.addEventListener('touchend', e => {
    if (state !== 'PLAYING') return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) player.move(1);
        if (dx < -30) player.move(-1);
    }
});

// Initial Draw
initBackground();
preloadCharacters();
draw();
