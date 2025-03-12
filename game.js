// 游戏配置
const config = {
    rows: 8,
    cols: 8,
    types: 5, // 不同类型的方块数量
    tileSize: 60, // 方块大小
    matchMin: 3, // 最少消除数量
    animationDuration: 200, // 动画持续时间（毫秒）
    maxAnimations: 100, // 限制同时进行的动画数量
    margin: {
        left: 0,  // 水平边距，将在初始化时计算
        top: 0    // 垂直边距，将在初始化时计算
    },
    // 添加每种颜色的方块数量配置
    tilesPerType: 8 // 每种颜色8个方块，确保是偶数
};

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 游戏状态
let gameState = {
    score: 0,
    isRunning: true,
    board: [],
    selectedTiles: [], // 存储已选中的方块
    hoveredTile: null, // 新增：记录悬浮的方块
    isAnimating: false, // 标记是否正在进行动画
    animations: [], // 存储动画效果
    timeRemaining: 30,  // 改为30秒
    timer: null,
    lastTimerUpdate: Date.now(), // 添加最后更新时间记录
    fireworks: [],
    lightnings: [],
    timerStarted: false // 新增：标记计时器是否已启动
};

// 添加动画效果的类
class Animation {
    constructor(row, col, type) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.progress = 0;
        this.duration = 500;
        this.startTime = performance.now();
        this.isExplosion = false;
    }

    // 闪烁动画
    drawFlash(ctx, x, y, size) {
        const flash = Math.sin(this.progress * Math.PI * 4) * 0.5 + 0.5;
        ctx.globalAlpha = flash;
    }

    // 爆炸动画
    drawExplosion(ctx, x, y, size) {
        const particles = 12;
        const radius = (this.progress * size) / 2;
        
        ctx.save(); // 保存当前上下文状态
        ctx.translate(x + size / 2, y + size / 2); // 移动到方块中心
        
        for (let i = 0; i < particles; i++) {
            const angle = (i / particles) * Math.PI * 2;
            const particleX = Math.cos(angle) * radius;
            const particleY = Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, 3 * (1 - this.progress), 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore(); // 恢复上下文状态
    }
}

// 添加音效生成器
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 生成点击音效
function createClickSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 生成匹配音效
function createMatchSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

// 添加失败音效生成函数
function createFailSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// 添加计时器音效生成函数
function createTimerSound(isWarning = false) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (isWarning) {
        // 警告音效
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } else {
        // 普通计时音效
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
}

// 修改音效配置
const soundConfig = {
    enabled: true
};

// 修改音效控制按钮
const soundToggle = document.getElementById('soundToggle');
soundToggle.addEventListener('click', () => {
    soundConfig.enabled = !soundConfig.enabled;
    soundToggle.textContent = soundConfig.enabled ? '🔊' : '🔈';
});

// 修改播放音效函数
function playSound(type) {
    if (!soundConfig.enabled) return;
    
    switch(type) {
        case 'click':
            createClickSound();
            break;
        case 'match':
            createMatchSound();
            break;
        case 'fail':
            createFailSound();
            break;
        case 'lightning':
            createLightningSound();
            break;
        case 'explosion':
            createExplosionSound();
            break;
        case 'cheer':
            createCheerSound();
            break;
        case 'fireworkBurst':
            createFireworkBurstSound();
            break;
    }
}

// 修改计时器更新函数
function updateTimer() {
    if (!gameState.isRunning) return;
    
    const now = Date.now();
    // 确保至少过了1秒才更新
    if (now - gameState.lastTimerUpdate >= 1000) {
        gameState.timeRemaining--;
        const timeElement = document.getElementById('time');
        const timerContainer = document.querySelector('.timer');
        timeElement.textContent = gameState.timeRemaining;
        gameState.lastTimerUpdate = now;
        
        // 播放计时音效
        if (soundConfig.enabled) {
            if (gameState.timeRemaining <= 5) {
                // 最后5秒播放警告音效
                createTimerSound(true);
                timerContainer.classList.add('warning');
            } else if (gameState.timeRemaining <= 10) {
                // 10秒内播放普通音效
                createTimerSound();
                if (!timerContainer.classList.contains('warning')) {
                    timerContainer.classList.add('warning');
                }
            }
        }
        
        if (gameState.timeRemaining <= 0) {
            endGame('时间到！');
        }
    }
}

// 修改游戏结束函数
function endGame(reason) {
    gameState.isRunning = false;
    clearInterval(gameState.timer);
    
    // 先停止任何可能正在播放的声音
    if (audioContext.state === 'running') {
        // 使用新的音频上下文来避免旧声音的干扰
        audioContext.suspend().then(() => {
            audioContext.resume();
            
            const gameOverBackground = document.getElementById('gameOverBackground');
            const gameOverContent = document.getElementById('gameOverContent');
            const finalScoreElement = document.getElementById('finalScore');
            finalScoreElement.textContent = gameState.score;
            
            console.log("游戏结束原因:", reason); // 添加调试信息
            
            // 检查是否完成了所有匹配
            let allCleared = true;
            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    if (gameState.board[row][col].type !== -1) {
                        allCleared = false;
                        break;
                    }
                }
                if (!allCleared) break;
            }
            
            // 等待短暂延迟再播放声音，以确保音频上下文已准备好
            setTimeout(() => {
                // 判断游戏结束的原因并播放相应音效
                if (reason === '游戏完成！' || allCleared) {
                    // 完成所有匹配时播放欢呼声
                    console.log("播放欢呼声"); // 添加调试信息
                    playSound('cheer');
                } else {
                    // 未完成所有匹配时播放爆炸声
                    console.log("播放爆炸声"); // 添加调试信息
                    playSound('explosion');
                }
            }, 100);
            
            // 先显示黑色背景
            gameOverBackground.style.display = 'block';
            
            // 如果分数超过500，显示烟花效果
            if (gameState.score >= 500) {
                const fireworksCanvas = document.getElementById('fireworksCanvas');
                fireworksCanvas.style.display = 'block';
                resizeFireworksCanvas();
                gameState.fireworks = Array(5).fill(null).map(() => new Firework());
                requestAnimationFrame(animateFireworks);
            }
            
            // 最后显示结算内容
            gameOverContent.style.display = 'block';
        });
    } else {
        // 如果音频上下文不在运行状态，先恢复它
        audioContext.resume().then(() => {
            const gameOverBackground = document.getElementById('gameOverBackground');
            const gameOverContent = document.getElementById('gameOverContent');
            const finalScoreElement = document.getElementById('finalScore');
            finalScoreElement.textContent = gameState.score;
            
            console.log("游戏结束原因:", reason);
            
            let allCleared = true;
            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    if (gameState.board[row][col].type !== -1) {
                        allCleared = false;
                        break;
                    }
                }
                if (!allCleared) break;
            }
            
            setTimeout(() => {
                if (reason === '游戏完成！' || allCleared) {
                    console.log("播放欢呼声");
                    playSound('cheer');
                } else {
                    console.log("播放爆炸声");
                    playSound('explosion');
                }
            }, 100);
            
            gameOverBackground.style.display = 'block';
            
            if (gameState.score >= 500) {
                const fireworksCanvas = document.getElementById('fireworksCanvas');
                fireworksCanvas.style.display = 'block';
                resizeFireworksCanvas();
                gameState.fireworks = Array(5).fill(null).map(() => new Firework());
                requestAnimationFrame(animateFireworks);
            }
            
            gameOverContent.style.display = 'block';
        });
    }
}

// 修改重启游戏函数
function restartGame() {
    // 隐藏所有结算界面元素
    document.getElementById('gameOverBackground').style.display = 'none';
    document.getElementById('gameOverContent').style.display = 'none';
    
    // 停止烟花效果
    const fireworksCanvas = document.getElementById('fireworksCanvas');
    fireworksCanvas.style.display = 'none';
    gameState.fireworks = [];
    if (fwCtx) {
        fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }
    
    // 重置游戏状态
    gameState = {
        score: 0,
        isRunning: true,
        board: [],
        selectedTiles: [],
        hoveredTile: null,
        animations: [],
        timeRemaining: 30,
        timer: null,
        lastTimerUpdate: Date.now(),
        fireworks: [],
        lightnings: [],
        timerStarted: false // 重置计时器启动标志
    };
    
    // 重置分数和时间显示
    document.getElementById('score').textContent = '0';
    document.getElementById('time').textContent = '30';
    
    // 清空并重置画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    // 初始化新游戏
    initBoard();
    
    // 重置计时器样式
    document.querySelector('.timer').classList.remove('warning');
    
    // 重启游戏循环
    gameLoop();
}

// 烟花效果相关代码
const fireworksCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fireworksCanvas.getContext('2d');

// 修改烟花画布尺寸设置函数
function resizeFireworksCanvas() {
    const fireworksCanvas = document.getElementById('fireworksCanvas');
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    fwCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    fwCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
}

// 添加烟花音效生成函数
function createFireworkSound() {
    // 发射音效 - 增强版
    const launchOsc = audioContext.createOscillator();
    const launchGain = audioContext.createGain();
    const launchFilter = audioContext.createBiquadFilter();
    
    launchOsc.connect(launchFilter);
    launchFilter.connect(launchGain);
    launchGain.connect(audioContext.destination);
    
    launchOsc.type = 'sine';
    launchOsc.frequency.setValueAtTime(800, audioContext.currentTime);
    launchOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
    
    launchFilter.type = 'lowpass';
    launchFilter.frequency.setValueAtTime(1000, audioContext.currentTime);
    launchFilter.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.3);
    
    launchGain.gain.setValueAtTime(0.3, audioContext.currentTime);
    launchGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    launchOsc.start();
    launchOsc.stop(audioContext.currentTime + 0.3);
    
    // 添加呼啸声
    setTimeout(() => {
        const whistleOsc = audioContext.createOscillator();
        const whistleGain = audioContext.createGain();
        
        whistleOsc.connect(whistleGain);
        whistleGain.connect(audioContext.destination);
        
        whistleOsc.type = 'sine';
        whistleOsc.frequency.setValueAtTime(300, audioContext.currentTime);
        whistleOsc.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.2);
        
        whistleGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        whistleGain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        whistleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        whistleOsc.start();
        whistleOsc.stop(audioContext.currentTime + 0.2);
    }, 100);
}

// 修改 Firework 类
class Firework {
    constructor() {
        this.reset();
        if (soundConfig.enabled) {
            createFireworkSound();
        }
    }
    
    reset() {
        this.x = Math.random() * fireworksCanvas.width;
        this.y = fireworksCanvas.height;
        this.targetY = fireworksCanvas.height * 0.2 + Math.random() * (fireworksCanvas.height * 0.3);
        this.speed = 8 + Math.random() * 4; // 增加速度
        this.particles = [];
        this.exploded = false;
        this.hue = Math.random() * 360;
        this.brightness = 60 + Math.random() * 20; // 增加亮度
        this.trailLength = 5; // 添加尾迹长度
        this.trail = []; // 存储尾迹点
    }
    
    update() {
        if (!this.exploded) {
            // 更新尾迹
            this.trail.push({x: this.x, y: this.y});
            if (this.trail.length > this.trailLength) {
                this.trail.shift();
            }
            
            this.y -= this.speed;
            if (this.y <= this.targetY) {
                this.explode();
            }
        } else {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                }
            }
            if (this.particles.length === 0) {
                this.reset();
            }
        }
    }
    
    draw() {
        if (!this.exploded) {
            // 绘制尾迹
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const alpha = i / this.trail.length;
                fwCtx.beginPath();
                fwCtx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                fwCtx.fillStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${alpha})`;
                fwCtx.fill();
            }
            
            // 绘制火箭
            fwCtx.beginPath();
            fwCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            fwCtx.fillStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
            fwCtx.fill();
        }
        
        // 绘制粒子
        for (const p of this.particles) {
            p.draw();
        }
    }
    
    explode() {
        this.exploded = true;
        const particleCount = 150; // 增加粒子数量
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(this.x, this.y, this.hue, this.brightness));
        }
        
        // 添加烟花爆炸音效
        if (soundConfig.enabled) {
            playSound('fireworkBurst');
        }
    }
}

// 修改 Particle 类
class Particle {
    constructor(x, y, hue, brightness) {
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.brightness = brightness;
        this.alpha = 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3; // 增加速度
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 2 + 1; // 随机粒子大小
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.07; // 增加重力效果
        this.alpha -= 0.008; // 减慢消失速度
    }
    
    draw() {
        fwCtx.beginPath();
        fwCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        fwCtx.fillStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        fwCtx.fill();
    }
}

// 修改烟花动画循环
function animateFireworks() {
    if (!gameState.fireworks.length) return;
    
    requestAnimationFrame(animateFireworks);
    
    // 减小透明度，创造拖尾效果
    fwCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    fwCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    for (let i = gameState.fireworks.length - 1; i >= 0; i--) {
        const fw = gameState.fireworks[i];
        fw.update();
        fw.draw();
    }
}

// 停止烟花效果
function stopFireworks() {
    gameState.fireworks = [];
    const fireworksCanvas = document.getElementById('fireworksCanvas');
    fireworksCanvas.style.display = 'none'; // 隐藏烟花画布
    if (fwCtx) {
        fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }
}

// 初始化游戏板
function initBoard() {
    // 计算画布边距，使游戏板水平和垂直居中
    config.margin.left = (canvas.width - (config.cols * config.tileSize)) / 2;
    config.margin.top = (canvas.height - (config.rows * config.tileSize)) / 2;
    
    // 创建包含确定数量的每种颜色的方块数组
    let allTiles = [];
    for (let type = 0; type < config.types; type++) {
        for (let i = 0; i < config.tilesPerType; i++) {
            allTiles.push(type);
        }
    }
    
    // 确保总方块数量正确
    const totalTiles = config.rows * config.cols;
    if (allTiles.length > totalTiles) {
        allTiles = allTiles.slice(0, totalTiles);
    } else if (allTiles.length < totalTiles) {
        // 如果方块不够，添加配对的方块
        const remaining = totalTiles - allTiles.length;
        for (let i = 0; i < remaining; i += 2) {
            const type = Math.floor(i / 2) % config.types;
            allTiles.push(type, type);
        }
    }
    
    // Fisher-Yates 洗牌算法
    for (let i = allTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
    }
    
    // 验证每种颜色的方块数量是否为偶数
    const colorCounts = new Array(config.types).fill(0);
    allTiles.forEach(type => colorCounts[type]++);
    
    // 如果发现某种颜色的数量为奇数，进行调整
    for (let i = 0; i < colorCounts.length; i++) {
        if (colorCounts[i] % 2 !== 0) {
            // 找到另一个奇数数量的颜色进行交换
            for (let j = i + 1; j < colorCounts.length; j++) {
                if (colorCounts[j] % 2 !== 0) {
                    // 找到第一个颜色i的方块
                    const index1 = allTiles.findIndex(type => type === i);
                    // 找到第一个颜色j的方块
                    const index2 = allTiles.findIndex(type => type === j);
                    // 交换它们
                    [allTiles[index1], allTiles[index2]] = [allTiles[index2], allTiles[index1]];
                    // 更新计数
                    colorCounts[i]++;
                    colorCounts[j]--;
                    break;
                }
            }
        }
    }
    
    // 填充棋盘
    let tileIndex = 0;
    for (let row = 0; row < config.rows; row++) {
        gameState.board[row] = [];
        for (let col = 0; col < config.cols; col++) {
            gameState.board[row][col] = {
                type: allTiles[tileIndex++],
                x: config.margin.left + col * config.tileSize,
                y: config.margin.top + row * config.tileSize
            };
        }
    }

    // 验证最终的方块分布
    validateBoard();
}

// 添加验证函数
function validateBoard() {
    const colorCounts = new Array(config.types).fill(0);
    
    // 统计每种颜色的方块数量
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const type = gameState.board[row][col].type;
            if (type !== -1) {
                colorCounts[type]++;
            }
        }
    }
    
    // 检查每种颜色是否都是偶数
    let isValid = true;
    colorCounts.forEach((count, type) => {
        if (count % 2 !== 0) {
            console.error(`颜色 ${type} 的方块数量为 ${count}，不是偶数！`);
            isValid = false;
        }
    });
    
    // 如果验证失败，重新初始化棋盘
    if (!isValid) {
        console.log('重新初始化棋盘...');
        initBoard();
    }
}

// 绘制单个方块
function drawTile(tile, row, col) {
    const colors = [
        '#FFB5B5', // 柔和的粉色
        '#B5E5B5', // 柔和的绿色
        '#B5D5FF', // 柔和的蓝色
        '#FFE5B5', // 柔和的黄色
        '#E5B5FF'  // 柔和的紫色
    ];

    if (tile.type === -1) {
        ctx.strokeStyle = '#EEEEEE';
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.x + 2, tile.y + 2, config.tileSize - 4, config.tileSize - 4);
        return;
    }

    // 保存当前上下文状态
    ctx.save();
    
    let tileColor = colors[tile.type];
    ctx.globalAlpha = 1;

    // 检查是否有动画
    const animation = gameState.animations.find(a => a.row === row && a.col === col);
    if (animation) {
        const now = performance.now();
        animation.progress = Math.min((now - animation.startTime) / animation.duration, 1);
        
        if (animation.isExplosion) {
            ctx.fillStyle = tileColor;
            animation.drawExplosion(ctx, tile.x, tile.y, config.tileSize);
            ctx.restore();
            return;
        } else {
            animation.drawFlash(ctx, tile.x, tile.y, config.tileSize);
        }
    }

    // 处理悬浮效果
    if (gameState.hoveredTile && row === gameState.hoveredTile.row && col === gameState.hoveredTile.col) {
        tileColor = lightenColor(tileColor, 10);
    }

    // 绘制方块主体
    ctx.fillStyle = tileColor;
    ctx.fillRect(tile.x + 2, tile.y + 2, config.tileSize - 4, config.tileSize - 4);

    // 绘制边框
    ctx.fillStyle = darkenColor(tileColor, 15);
    ctx.fillRect(tile.x + 2, tile.y + 2, config.tileSize - 4, 2);
    ctx.fillRect(tile.x + 2, tile.y + 2, 2, config.tileSize - 4);

    // 选中效果
    const isSelected = gameState.selectedTiles.some(t => t.row === row && t.col === col);
    if (isSelected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(tile.x + 2, tile.y + 2, config.tileSize - 4, config.tileSize - 4);
    }

    // 恢复上下文状态
    ctx.restore();
}

// 辅助函数：使颜色变亮
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// 辅助函数：使颜色变暗
function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (
        0x1000000 +
        (R > 0 ? R : 0) * 0x10000 +
        (G > 0 ? G : 0) * 0x100 +
        (B > 0 ? B : 0)
    ).toString(16).slice(1);
}

// 绘制游戏板
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制所有方块
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            drawTile(gameState.board[row][col], row, col);
        }
    }
    
    // 绘制闪电效果
    if (gameState.lightnings.length > 0) {
        for (let i = gameState.lightnings.length - 1; i >= 0; i--) {
            const lightning = gameState.lightnings[i];
            lightning.update();
            if (!lightning.draw(ctx)) {
                gameState.lightnings.splice(i, 1);
            }
        }
    }
}

// 修改路径检查函数
function canConnect(start, end) {
    // 如果是同一个位置，返回false
    if (start.row === end.row && start.col === end.col) return false;
    
    // 如果类型不同，返回false
    if (gameState.board[start.row][start.col].type !== gameState.board[end.row][end.col].type) return false;

    // 检查直线路径
    if (checkStraightPath(start, end)) {
        return true;
    }

    // 检查一次转弯的路径
    if (checkOneTurnPath(start, end)) {
        return true;
    }

    // 检查两次转弯的路径
    return checkTwoTurnPath(start, end);
}

// 检查直线路径是否可行
function checkStraightPath(start, end) {
    if (start.row === end.row) {
        // 水平方向
        const row = start.row;
        const startCol = Math.min(start.col, end.col);
        const endCol = Math.max(start.col, end.col);
        
        for (let col = startCol + 1; col < endCol; col++) {
            if (gameState.board[row][col].type !== -1) {
                return false;
            }
        }
        return true;
    } else if (start.col === end.col) {
        // 垂直方向
        const col = start.col;
        const startRow = Math.min(start.row, end.row);
        const endRow = Math.max(start.row, end.row);
        
        for (let row = startRow + 1; row < endRow; row++) {
            if (gameState.board[row][col].type !== -1) {
                return false;
            }
        }
        return true;
    }
    return false;
}

// 检查一次转弯的路径
function checkOneTurnPath(start, end) {
    // 检查两个可能的转弯点
    const corner1 = {row: start.row, col: end.col};
    const corner2 = {row: end.row, col: start.col};
    
    // 检查第一个转弯点
    if (gameState.board[corner1.row][corner1.col].type === -1) {
        if (checkStraightPath(start, corner1) && checkStraightPath(corner1, end)) {
            return true;
        }
    }
    
    // 检查第二个转弯点
    if (gameState.board[corner2.row][corner2.col].type === -1) {
        if (checkStraightPath(start, corner2) && checkStraightPath(corner2, end)) {
            return true;
        }
    }
    
    return false;
}

// 新增：检查两次转弯的路径
function checkTwoTurnPath(start, end) {
    // 遍历所有可能的中间点
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            // 跳过非空方块
            if (gameState.board[row][col].type !== -1) continue;
            
            const midPoint = {row, col};
            
            // 检查第一个转弯点
            const turn1 = {row: start.row, col: midPoint.col};
            if (gameState.board[turn1.row][turn1.col].type === -1 &&
                checkStraightPath(start, turn1) && 
                checkStraightPath(turn1, midPoint)) {
                
                // 检查第二个转弯点
                const turn2 = {row: midPoint.row, col: end.col};
                if (gameState.board[turn2.row][turn2.col].type === -1 &&
                    checkStraightPath(midPoint, turn2) && 
                    checkStraightPath(turn2, end)) {
                    return true;
                }
            }
            
            // 检查另一种可能的路径
            const altTurn1 = {row: midPoint.row, col: start.col};
            if (gameState.board[altTurn1.row][altTurn1.col].type === -1 &&
                checkStraightPath(start, altTurn1) && 
                checkStraightPath(altTurn1, midPoint)) {
                
                const altTurn2 = {row: end.row, col: midPoint.col};
                if (gameState.board[altTurn2.row][altTurn2.col].type === -1 &&
                    checkStraightPath(midPoint, altTurn2) && 
                    checkStraightPath(altTurn2, end)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 添加计时器启动函数
function startTimer() {
    if (!gameState.timerStarted) {
        gameState.timerStarted = true;
        gameState.lastTimerUpdate = Date.now();
        if (gameState.timer) {
            clearInterval(gameState.timer);
        }
        gameState.timer = setInterval(updateTimer, 100);
    }
}

// 修改点击事件处理函数，在第一次点击时启动计时器
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const col = Math.floor((x - config.margin.left) / config.tileSize);
    const row = Math.floor((y - config.margin.top) / config.tileSize);
    
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return;
    if (gameState.board[row][col].type === -1) return;

    // 启动计时器（如果还未启动）
    startTimer();

    const clickedTile = {row, col, type: gameState.board[row][col].type};
    
    // 播放点击音效
    playSound('click');
    
    if (gameState.selectedTiles.length === 0) {
        gameState.selectedTiles.push(clickedTile);
        return;
    }

    const firstTile = gameState.selectedTiles[0];

    // 检查是否可以连接
    if (firstTile.type === gameState.board[row][col].type && 
        canConnect(firstTile, {row, col})) {
        
        if (firstTile.row === row && firstTile.col === col) {
            return;
        }

        gameState.selectedTiles.push(clickedTile);
        // 播放匹配音效
        playSound('match');
        removeTiles(gameState.selectedTiles);
    } else {
        // 播放失败音效
        playSound('fail');
        gameState.selectedTiles = [clickedTile];
    }
});

// 修改鼠标移动事件处理，考虑边距
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const col = Math.floor((x - config.margin.left) / config.tileSize);
    const row = Math.floor((y - config.margin.top) / config.tileSize);
    
    if (row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
        gameState.hoveredTile = {row, col};
    } else {
        gameState.hoveredTile = null;
    }
});

// 鼠标离开画布时清除悬浮状态
canvas.addEventListener('mouseleave', () => {
    gameState.hoveredTile = null;
});

// 游戏主循环
function gameLoop() {
    draw();
    if (gameState.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// 添加检查是否还有可消除方块的函数
function hasValidMoves() {
    // 检查所有方块对之间是否存在可连接的路径
    for (let row1 = 0; row1 < config.rows; row1++) {
        for (let col1 = 0; col1 < config.cols; col1++) {
            const tile1 = gameState.board[row1][col1];
            if (tile1.type === -1) continue;

            for (let row2 = 0; row2 < config.rows; row2++) {
                for (let col2 = 0; col2 < config.cols; col2++) {
                    // 跳过同一个方块
                    if (row1 === row2 && col1 === col2) continue;
                    
                    const tile2 = gameState.board[row2][col2];
                    if (tile2.type === -1) continue;

                    // 如果找到一对可消除的方块，返回true
                    if (tile1.type === tile2.type && 
                        canConnect({row: row1, col: col1}, {row: row2, col: col2})) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// 添加重新布局函数
function rearrangeBoard() {
    // 收集所有剩余的方块
    let remainingTiles = [];
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            if (gameState.board[row][col].type !== -1) {
                remainingTiles.push(gameState.board[row][col].type);
            }
        }
    }

    // 如果剩余方块数量小于2，游戏结束
    if (remainingTiles.length < 2) {
        gameState.isRunning = false;
        alert("游戏结束！\n最终得分: " + gameState.score);
        return;
    }

    // 打乱剩余方块
    for (let i = remainingTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTiles[i], remainingTiles[j]] = [remainingTiles[j], remainingTiles[i]];
    }

    // 重新布局方块
    let tileIndex = 0;
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            if (gameState.board[row][col].type !== -1) {
                gameState.board[row][col].type = remainingTiles[tileIndex++];
            }
        }
    }
}

// 修改 removeTiles 函数，移除动画锁定
function removeTiles(tiles) {
    if (!tiles || tiles.length === 0) return;
    
    const tilesToRemove = tiles.map(tile => ({...tile}));
    
    // 显示闪电连接效果
    if (tilesToRemove.length >= 2) {
        const startTile = gameState.board[tilesToRemove[0].row][tilesToRemove[0].col];
        const endTile = gameState.board[tilesToRemove[1].row][tilesToRemove[1].col];
        gameState.lightnings.push(new Lightning(startTile, endTile));
        playSound('lightning');
    }
    
    // 立即清除选中状态，允许新的选择
    gameState.selectedTiles = [];
    
    // 添加闪烁动画
    tilesToRemove.forEach(tile => {
        const anim = new Animation(tile.row, tile.col, tile.type);
        gameState.animations.push(anim);
    });

    setTimeout(() => {
        // 移除闪烁动画
        gameState.animations = gameState.animations.filter(a => !tilesToRemove.some(t => 
            t.row === a.row && t.col === a.col));
        
        // 添加爆炸动画
        tilesToRemove.forEach(tile => {
            const anim = new Animation(tile.row, tile.col, tile.type);
            anim.isExplosion = true;
            gameState.animations.push(anim);
        });

        // 立即消除方块，不等待爆炸动画完成
        tilesToRemove.forEach(tile => {
            if (tile.row >= 0 && tile.row < config.rows && 
                tile.col >= 0 && tile.col < config.cols) {
                gameState.board[tile.row][tile.col].type = -1;
            }
        });
        
        gameState.score += tilesToRemove.length * 10;
        scoreElement.textContent = gameState.score;

        // 在爆炸动画结束后清理动画
        setTimeout(() => {
            gameState.animations = gameState.animations.filter(a => !tilesToRemove.some(t => 
                t.row === a.row && t.col === a.col));
            
            // 检查是否还有可消除的方块
            if (!hasValidMoves()) {
                if (gameState.timeRemaining > 0) {
                    rearrangeBoard();
                    if (!hasValidMoves()) {
                        endGame('游戏完成！');
                    }
                } else {
                    endGame('时间到！');
                }
            }
        }, 500);
    }, 500);
}

// 闪电效果类
class Lightning {
    constructor(startTile, endTile) {
        this.startX = startTile.x + config.tileSize / 2;
        this.startY = startTile.y + config.tileSize / 2;
        this.endX = endTile.x + config.tileSize / 2;
        this.endY = endTile.y + config.tileSize / 2;
        this.segments = 10;
        this.width = 4;
        this.color = '#FFFFFF';
        this.duration = 300;
        this.startTime = performance.now();
        this.progress = 0;
        
        // 创建闪电路径
        this.path = this.generatePath();
    }
    
    generatePath() {
        let path = [{x: this.startX, y: this.startY}];
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        
        for (let i = 1; i < this.segments; i++) {
            const ratio = i / this.segments;
            const x = this.startX + dx * ratio;
            const y = this.startY + dy * ratio;
            // 添加随机偏移
            const offset = (1 - ratio) * 15;
            path.push({
                x: x + (Math.random() * 2 - 1) * offset,
                y: y + (Math.random() * 2 - 1) * offset
            });
        }
        
        path.push({x: this.endX, y: this.endY});
        return path;
    }
    
    update() {
        const now = performance.now();
        this.progress = Math.min((now - this.startTime) / this.duration, 1);
        
        // 定期重新生成路径，让闪电看起来更活跃
        if (Math.random() < 0.3) {
            this.path = this.generatePath();
        }
    }
    
    draw(ctx) {
        if (this.progress >= 1) return false;
        
        ctx.save();
        
        // 绘制闪电光晕
        ctx.globalAlpha = (1 - this.progress) * 0.7;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width + 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();
        
        // 绘制闪电核心
        ctx.globalAlpha = (1 - this.progress);
        ctx.strokeStyle = '#88FFFF';
        ctx.lineWidth = this.width;
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();
        
        ctx.restore();
        
        return this.progress < 1;
    }
}

// 添加闪电音效生成函数
function createLightningSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// 添加窗口大小调整响应
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeGame, 250);
});

// 自适应布局函数
function resizeGame() {
    const container = document.body;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight - document.querySelector('.game-title').offsetHeight - document.querySelector('.game-controls').offsetHeight - 40;

    // 确定合适的游戏尺寸
    let gameSize = Math.min(containerWidth - 40, containerHeight);
    gameSize = Math.min(gameSize, 600); // 限制最大尺寸
    
    // 调整画布尺寸
    canvas.width = gameSize;
    canvas.height = gameSize;
    
    // 调整方块尺寸
    config.tileSize = Math.floor(gameSize / config.cols);
    
    // 重新计算边距
    config.margin.left = (canvas.width - (config.cols * config.tileSize)) / 2;
    config.margin.top = (canvas.height - (config.rows * config.tileSize)) / 2;
    
    // 更新方块位置
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            if (gameState.board[row] && gameState.board[row][col]) {
                gameState.board[row][col].x = config.margin.left + col * config.tileSize;
                gameState.board[row][col].y = config.margin.top + row * config.tileSize;
            }
        }
    }
    
    // 重绘游戏
    draw();
}

// 添加触摸事件支持
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

let touchStartPosition = null;

function handleTouch(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    touchStartPosition = {x, y};
    
    const col = Math.floor((x - config.margin.left) / config.tileSize);
    const row = Math.floor((y - config.margin.top) / config.tileSize);
    
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return;
    if (gameState.board[row][col].type === -1) return;

    // 启动计时器（如果还未启动）
    startTimer();

    const touchedTile = {row, col, type: gameState.board[row][col].type};
    
    // 播放点击音效
    playSound('click');
    
    if (gameState.selectedTiles.length === 0) {
        gameState.selectedTiles.push(touchedTile);
    } else {
        const firstTile = gameState.selectedTiles[0];

        // 检查是否可以连接
        if (firstTile.type === gameState.board[row][col].type && 
            canConnect(firstTile, {row, col})) {
            
            if (firstTile.row === row && firstTile.col === col) {
                return;
            }

            gameState.selectedTiles.push(touchedTile);
            // 播放匹配音效
            playSound('match');
            removeTiles(gameState.selectedTiles);
        } else {
            // 播放失败音效
            playSound('fail');
            gameState.selectedTiles = [touchedTile];
        }
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const col = Math.floor((x - config.margin.left) / config.tileSize);
    const row = Math.floor((y - config.margin.top) / config.tileSize);
    
    if (row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
        gameState.hoveredTile = {row, col};
    } else {
        gameState.hoveredTile = null;
    }
}

function handleTouchEnd(event) {
    touchStartPosition = null;
}

// 在游戏初始化时调用自适应布局
function initGame() {
    initBoard();
    resizeGame();
    gameLoop();
}

// 修改初始化和重启游戏函数
// 替换原来的直接调用initBoard()和gameLoop()
// 使用下面这行代替:
// initGame();

// 初始化并启动游戏
document.addEventListener('DOMContentLoaded', function() {
    initGame();
});

// 添加新的音效生成函数，用于结束场景

// 爆炸声音效（游戏结束但未完成全部匹配）
function createExplosionSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // 添加噪音效果
    setTimeout(() => {
        const noise = audioContext.createOscillator();
        const noiseGain = audioContext.createGain();
        
        noise.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(80, audioContext.currentTime);
        noise.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.3);
        
        noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        noise.start();
        noise.stop(audioContext.currentTime + 0.3);
    }, 100);
}

// 超强欢呼声音效 - 大幅增强版
function createCheerSound() {
    // 确保旧声音停止
    const allSounds = [];

    // 多层次欢呼声
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            // 喜悦的高音部分
            const highOsc = audioContext.createOscillator();
            const highGain = audioContext.createGain();
            
            highOsc.connect(highGain);
            highGain.connect(audioContext.destination);
            
            highOsc.type = 'sine';
            highOsc.frequency.setValueAtTime(600 + i * 100, audioContext.currentTime);
            highOsc.frequency.exponentialRampToValueAtTime(900 + i * 80, audioContext.currentTime + 0.2);
            highOsc.frequency.exponentialRampToValueAtTime(700 + i * 70, audioContext.currentTime + 0.4);
            
            // 增加音量
            highGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            highGain.gain.exponentialRampToValueAtTime(0.4, audioContext.currentTime + 0.2);
            highGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            highOsc.start();
            highOsc.stop(audioContext.currentTime + 0.5);
            allSounds.push(highOsc);
        }, i * 120);
    }
    
    // 人群欢呼声
    setTimeout(() => {
        // 模拟人群欢呼声
        const noise = audioContext.createBufferSource();
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.8, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        
        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        noiseFilter.Q.value = 0.5;
        
        // 音量包络
        noiseGain.gain.setValueAtTime(0.01, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        noise.start();
        noise.stop(audioContext.currentTime + 0.8);
        allSounds.push(noise);
    }, 100);
    
    // 鼓掌声效果
    setTimeout(() => {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                // 创建噪声源
                const noise = audioContext.createBufferSource();
                const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                
                for (let j = 0; j < noiseBuffer.length; j++) {
                    noiseData[j] = Math.random() * 2 - 1;
                }
                
                const noiseGain = audioContext.createGain();
                const noiseFilter = audioContext.createBiquadFilter();
                
                noise.buffer = noiseBuffer;
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(audioContext.destination);
                
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 2000;
                noiseFilter.Q.value = 1.0;
                
                noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                noise.start();
                noise.stop(audioContext.currentTime + 0.1);
                allSounds.push(noise);
            }, i * 150 + Math.random() * 50);
        }
    }, 200);
    
    // 欢快的低音伴奏
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const lowOsc = audioContext.createOscillator();
                const lowGain = audioContext.createGain();
                
                lowOsc.connect(lowGain);
                lowGain.connect(audioContext.destination);
                
                lowOsc.type = 'triangle';
                const baseFreq = 200 + i * 50;
                lowOsc.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
                lowOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.3);
                lowOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, audioContext.currentTime + 0.6);
                
                // 增大音量
                lowGain.gain.setValueAtTime(0.4, audioContext.currentTime);
                lowGain.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
                lowGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
                
                lowOsc.start();
                lowOsc.stop(audioContext.currentTime + 0.6);
                allSounds.push(lowOsc);
            }, i * 200);
        }
    }, 150);
    
    // 胜利的号角声
    setTimeout(() => {
        const trumpetOsc = audioContext.createOscillator();
        const trumpetGain = audioContext.createGain();
        const trumpetFilter = audioContext.createBiquadFilter();
        
        trumpetOsc.connect(trumpetFilter);
        trumpetFilter.connect(trumpetGain);
        trumpetGain.connect(audioContext.destination);
        
        trumpetOsc.type = 'sawtooth';
        trumpetFilter.type = 'lowpass';
        trumpetFilter.frequency.value = 1000;
        trumpetFilter.Q.value = 5;
        
        trumpetOsc.frequency.setValueAtTime(440, audioContext.currentTime);
        trumpetOsc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
        
        trumpetGain.gain.setValueAtTime(0.01, audioContext.currentTime);
        trumpetGain.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        trumpetGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        trumpetOsc.start();
        trumpetOsc.stop(audioContext.currentTime + 0.4);
        allSounds.push(trumpetOsc);
    }, 400);
    
    // 确保所有声音不超过10秒
    setTimeout(() => {
        allSounds.forEach(sound => {
            try {
                sound.stop();
            } catch (e) {
                // 忽略已经停止的声音
            }
        });
    }, 10000);
}

// 超级绚烂的烟花绽放声音效 - 大幅增强版
function createFireworkBurstSound() {
    // 跟踪所有声音对象以便后续管理
    const allSounds = [];
    
    // 主爆炸声 - 更强的音量
    const mainBurstOsc = audioContext.createOscillator();
    const mainBurstGain = audioContext.createGain();
    const distortion = audioContext.createWaveShaper();
    
    // 添加失真效果使声音更加炸裂
    function makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }
    
    distortion.curve = makeDistortionCurve(400);
    distortion.oversample = '4x';
    
    mainBurstOsc.connect(distortion);
    distortion.connect(mainBurstGain);
    mainBurstGain.connect(audioContext.destination);
    
    mainBurstOsc.type = 'sawtooth';
    mainBurstOsc.frequency.setValueAtTime(200, audioContext.currentTime);
    mainBurstOsc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
    
    // 大幅增加初始音量
    mainBurstGain.gain.setValueAtTime(0.5, audioContext.currentTime);
    mainBurstGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    mainBurstOsc.start();
    mainBurstOsc.stop(audioContext.currentTime + 0.5);
    allSounds.push(mainBurstOsc);
    
    // 多层次爆炸声
    const explosionLayers = 5; // 增加层数
    for (let i = 0; i < explosionLayers; i++) {
        setTimeout(() => {
            const burstOsc = audioContext.createOscillator();
            const burstGain = audioContext.createGain();
            
            burstOsc.connect(burstGain);
            burstGain.connect(audioContext.destination);
            
            // 不同的振荡器类型和随机化频率
            burstOsc.type = ['sine', 'triangle', 'sawtooth', 'square'][i % 4];
            const baseFreq = 600 - i * 80;
            burstOsc.frequency.setValueAtTime(baseFreq + Math.random() * 100, audioContext.currentTime);
            burstOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3 + Math.random() * 50, audioContext.currentTime + 0.3);
            
            // 增大音量
            burstGain.gain.setValueAtTime(0.35 - i * 0.05, audioContext.currentTime);
            burstGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3 + Math.random() * 0.2);
            
            burstOsc.start();
            burstOsc.stop(audioContext.currentTime + 0.5);
            allSounds.push(burstOsc);
        }, i * 40); // 更紧密的时间间隔
    }
    
    // 更多的散落火花声
    setTimeout(() => {
        const sparkleCount = 12; // 增加火花数量
        for (let i = 0; i < sparkleCount; i++) {
            setTimeout(() => {
                const sparkleOsc = audioContext.createOscillator();
                const sparkleGain = audioContext.createGain();
                
                sparkleOsc.connect(sparkleGain);
                sparkleGain.connect(audioContext.destination);
                
                // 更多样化的频率和音色
                sparkleOsc.type = ['triangle', 'sine', 'square'][Math.floor(Math.random() * 3)];
                sparkleOsc.frequency.setValueAtTime(800 + Math.random() * 600, audioContext.currentTime);
                sparkleOsc.frequency.exponentialRampToValueAtTime(300 + Math.random() * 200, audioContext.currentTime + 0.2);
                
                // 增大音量和随机化衰减
                sparkleGain.gain.setValueAtTime(0.1 + Math.random() * 0.15, audioContext.currentTime);
                sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1 + Math.random() * 0.3);
                
                sparkleOsc.start();
                sparkleOsc.stop(audioContext.currentTime + 0.4);
                allSounds.push(sparkleOsc);
            }, i * 40 + Math.random() * 150);
        }
    }, 80);
    
    // 增强的低频炸裂声
    setTimeout(() => {
        const boomOsc = audioContext.createOscillator();
        const boomGain = audioContext.createGain();
        const boomFilter = audioContext.createBiquadFilter();
        
        boomOsc.connect(boomFilter);
        boomFilter.connect(boomGain);
        boomGain.connect(audioContext.destination);
        
        boomOsc.type = 'square';
        boomFilter.type = 'lowpass';
        boomFilter.frequency.value = 200;
        boomFilter.Q.value = 1.0;
        
        boomOsc.frequency.setValueAtTime(60, audioContext.currentTime);
        boomOsc.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.6);
        
        // 大幅增强低频部分音量
        boomGain.gain.setValueAtTime(0.5, audioContext.currentTime);
        boomGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        boomOsc.start();
        boomOsc.stop(audioContext.currentTime + 0.6);
        allSounds.push(boomOsc);
    }, 20);
    
    // 加入碎裂声效果
    setTimeout(() => {
        // 创建噪声源模拟碎裂声
        const noise = audioContext.createBufferSource();
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        
        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 5000;
        
        noiseGain.gain.setValueAtTime(0.01, audioContext.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        noise.start();
        noise.stop(audioContext.currentTime + 0.3);
        allSounds.push(noise);
    }, 150);
    
    // 确保所有声音最多持续5秒
    setTimeout(() => {
        allSounds.forEach(sound => {
            try {
                sound.stop();
            } catch (e) {
                // 忽略已经停止的声音
            }
        });
    }, 5000);
} 