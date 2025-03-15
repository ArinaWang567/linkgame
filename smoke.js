// 全新云效果系统 - 解决叠加问题，明显的大小差异，对称的速度变化
(function() {
    let cloudCanvas, cloudCtx;
    let gameCanvas;
    let clouds = [];
    let isCloudSystemActive = false;
    let animationId = null;
    let canvasWidth = 0;
    let canvasHeight = 0;
    
    // 在页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        initCloudSystem();
        setupTimerMonitor();
        setTimeout(repositionCloudCanvas, 100);
        window.addEventListener('resize', repositionCloudCanvas);
        window.addEventListener('orientationchange', repositionCloudCanvas);
        window.addEventListener('scroll', repositionCloudCanvas);
    });
    
    function initCloudSystem() {
        cloudCanvas = document.getElementById('smokeCanvas');
        gameCanvas = document.getElementById('gameCanvas');
        
        if (!cloudCanvas || !gameCanvas) {
            console.error('找不到必要的Canvas元素');
            return;
        }
        
        cloudCtx = cloudCanvas.getContext('2d', { alpha: true });
        
        console.log('云效果系统已初始化');
    }
    
    function repositionCloudCanvas() {
        if (!cloudCanvas || !gameCanvas) return;
        
        // 获取游戏画布的精确位置和尺寸
        const gameRect = gameCanvas.getBoundingClientRect();
        
        // 获取游戏画布的计算样式
        const gameStyle = window.getComputedStyle(gameCanvas);
        
        // 计算内容区域的确切位置和大小
        const borderLeft = parseInt(gameStyle.borderLeftWidth) || 0;
        const borderTop = parseInt(gameStyle.borderTopWidth) || 0;
        const borderRadius = gameStyle.borderRadius;
        
        // 设置云画布的确切位置和尺寸
        // 注意：我们完全匹配游戏画布的内容区域，包括其边框半径
        cloudCanvas.style.position = 'absolute';
        cloudCanvas.style.left = (gameRect.left + borderLeft) + 'px';
        cloudCanvas.style.top = (gameRect.top + borderTop) + 'px';
        cloudCanvas.style.width = (gameRect.width - 2 * borderLeft) + 'px';
        cloudCanvas.style.height = (gameRect.height - 2 * borderTop) + 'px';
        cloudCanvas.style.borderRadius = borderRadius;
        cloudCanvas.style.overflow = 'hidden'; // 确保云朵不超出边界
        
        // 设置画布内部分辨率
        cloudCanvas.width = gameRect.width - 2 * borderLeft;
        cloudCanvas.height = gameRect.height - 2 * borderTop;
        
        // 更新记录的画布尺寸
        canvasWidth = cloudCanvas.width;
        canvasHeight = cloudCanvas.height;
        
        console.log('云画布已精确对齐:', canvasWidth, canvasHeight);
        
        // 调试用 - 添加边框以便观察是否正确对齐（可在测试后删除）
        // cloudCanvas.style.border = '1px solid red';
    }
    
    function setupTimerMonitor() {
        setInterval(function() {
            const timeElement = document.getElementById('time');
            if (timeElement) {
                const currentTime = parseInt(timeElement.textContent);
                if (currentTime === 10) {
                    startCloudSystem();
                } else if (currentTime <= 0) {
                    stopCloudSystem();
                }
            }
        }, 500);
    }
    
    // 云朵类 - 完全重写
    class Cloud {
        constructor(options) {
            this.id = options.id || 0; // 唯一ID，用于调试
            this.side = options.side || 'left'; // 'left' 或 'right'
            this.lane = options.lane || 0; // 垂直车道 (0-2)
            this.sizeCategory = options.sizeCategory || 'medium'; // 'small', 'medium', 'large'
            this.delayTime = options.delayTime || 0; // 延迟出现的时间(毫秒)
            this.startTime = 0; // 开始移动的时间
            this.active = false; // 是否激活
            
            this.cloudParts = []; // 云朵组成部分
            this.initialize();
        }
        
        initialize() {
            if (!cloudCanvas) return;
            
            // 垂直位置基于车道
            const laneHeight = canvasHeight / 3;
            const laneTop = this.lane * laneHeight;
            
            // 在车道内随机位置，但避免靠近车道边界
            const padding = laneHeight * 0.15;
            this.y = laneTop + padding + Math.random() * (laneHeight - padding * 2);
            
            // 尺寸基于类别 - 确保最大云占游戏区域30%
            switch(this.sizeCategory) {
                case 'small':
                    this.baseSize = canvasHeight * 0.1; // 10% 的游戏高度
                    break;
                case 'medium':
                    this.baseSize = canvasHeight * 0.2; // 20% 的游戏高度
                    break;
                case 'large':
                    this.baseSize = canvasHeight * 0.3; // 30% 的游戏高度
                    break;
            }
            
            // 生成云朵形状
            this.generateCloudShape();
            
            // 设置移动参数
            this.totalDistance = canvasWidth * 1.6; // 移动总距离
            this.maxSpeed = 3 + Math.random() * 1.5; // 最大速度
            this.minSpeed = this.maxSpeed * 0.2; // 最小速度 (中间点的20%)
            
            // 初始位置
            if (this.side === 'left') {
                this.x = -this.width * 1.2; // 完全在左侧屏幕外
            } else {
                this.x = canvasWidth + this.width * 0.2; // 完全在右侧屏幕外
            }
            
            // 透明度控制
            this.maxOpacity = 0.8 + Math.random() * 0.2;
            this.opacity = 0;
        }
        
        generateCloudShape() {
            this.cloudParts = [];
            this.width = this.baseSize * 1.8; // 云朵总宽度
            
            // 创建更自然的云朵形状
            // 中心部分
            this.cloudParts.push({
                offsetX: 0,
                offsetY: 0,
                width: this.width,
                height: this.baseSize * 0.7
            });
            
            // 添加云朵的突起部分
            const numBumps = 6 + Math.floor(Math.random() * 3);
            const angleStep = (Math.PI * 2) / numBumps;
            
            for (let i = 0; i < numBumps; i++) {
                const angle = i * angleStep + Math.random() * 0.3;
                const distanceRatio = 0.5 + Math.random() * 0.2;
                const bumpSize = this.baseSize * (0.3 + Math.random() * 0.3);
                
                // 沿着椭圆周围分布突起
                const x = Math.cos(angle) * this.width * distanceRatio * 0.5;
                const y = Math.sin(angle) * this.baseSize * distanceRatio * 0.35;
                
                this.cloudParts.push({
                    offsetX: x,
                    offsetY: y,
                    radius: bumpSize
                });
            }
        }
        
        activate() {
            this.active = true;
            this.startTime = Date.now();
        }
        
        update() {
            // 检查是否应该激活
            if (!this.active && Date.now() >= this.delayTime) {
                this.activate();
            }
            
            // 如果未激活则不更新
            if (!this.active) return false;
            
            // 计算移动时间和进度
            const elapsedTime = Date.now() - this.startTime;
            let progress;
            
            if (this.side === 'left') {
                // 云从左到右移动
                progress = this.x / this.totalDistance;
            } else {
                // 云从右到左移动
                progress = 1 - ((this.x - (canvasWidth - this.totalDistance)) / this.totalDistance);
            }
            
            // 确保进度在0-1范围内
            progress = Math.max(0, Math.min(1, progress));
            
            // 对称的速度变化 - 用抛物线公式
            // 最快 -> 最慢 -> 最快
            const speedFactor = 1 - 0.8 * (1 - Math.pow(2 * progress - 1, 2));
            const currentSpeed = this.minSpeed + (this.maxSpeed - this.minSpeed) * speedFactor;
            
            // 移动云朵
            if (this.side === 'left') {
                this.x += currentSpeed;
            } else {
                this.x -= currentSpeed;
            }
            
            // 计算透明度 - 进出时透明，中间完全不透明
            this.opacity = Math.sin(progress * Math.PI) * this.maxOpacity;
            
            // 检查是否完成
            if ((this.side === 'left' && this.x > canvasWidth + this.width) || 
                (this.side === 'right' && this.x < -this.width)) {
                // 重新初始化
                this.initialize();
                this.active = false;
                return true; // 表示已完成一次移动
            }
            
            return false; // 表示还在移动中
        }
        
        draw() {
            if (!cloudCtx || !this.active) return;
            
            cloudCtx.save();
            
            // 设置全局透明度
            cloudCtx.globalAlpha = this.opacity;
            
            // 绘制云朵
            cloudCtx.fillStyle = 'white';
            
            // 绘制中心椭圆
            const centerPart = this.cloudParts[0];
            cloudCtx.beginPath();
            cloudCtx.ellipse(
                this.x + centerPart.offsetX, 
                this.y + centerPart.offsetY, 
                centerPart.width / 2, 
                centerPart.height / 2, 
                0, 0, Math.PI * 2
            );
            cloudCtx.fill();
            
            // 绘制云的突起部分
            for (let i = 1; i < this.cloudParts.length; i++) {
                const part = this.cloudParts[i];
                cloudCtx.beginPath();
                cloudCtx.arc(
                    this.x + part.offsetX,
                    this.y + part.offsetY,
                    part.radius,
                    0, Math.PI * 2
                );
                cloudCtx.fill();
            }
            
            cloudCtx.restore();
        }
    }
    
    function createClouds() {
        clouds = [];
        
        // 创建6个云 - 3个车道，每个车道2个云（左右各一个）
        const sizes = ['small', 'medium', 'large'];
        const sides = ['left', 'right'];
        const baseDelay = 1000; // 基础延迟
        
        for (let lane = 0; lane < 3; lane++) {
            for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
                // 交替使用不同尺寸，确保大小均匀分布
                const sizeIndex = (lane + sideIndex) % 3;
                
                // 创建云，并设置适当的延迟
                const delay = baseDelay * (lane + sideIndex * 2 + Math.random());
                
                const cloud = new Cloud({
                    id: clouds.length + 1,
                    side: sides[sideIndex],
                    lane: lane,
                    sizeCategory: sizes[sizeIndex],
                    delayTime: delay
                });
                
                clouds.push(cloud);
            }
        }
    }
    
    function startCloudSystem() {
        if (isCloudSystemActive) return;
        
        console.log('启动云效果系统');
        isCloudSystemActive = true;
        
        repositionCloudCanvas();
        
        cloudCanvas.style.backgroundColor = 'transparent';
        cloudCanvas.style.border = 'none';
        cloudCanvas.style.opacity = '1';
        
        // 创建云朵
        createClouds();
        
        // 启动动画
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animateClouds);
    }
    
    function stopCloudSystem() {
        if (!isCloudSystemActive) return;
        
        console.log('停止云效果系统');
        isCloudSystemActive = false;
        
        if (cloudCanvas) {
            cloudCanvas.style.opacity = '0';
        }
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        if (cloudCtx && cloudCanvas) {
            cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
        }
    }
    
    function animateClouds() {
        if (!isCloudSystemActive) return;
        
        if (cloudCtx && cloudCanvas) {
            // 清除画布
            cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
            
            // 更新并绘制所有云
            clouds.forEach(cloud => {
                cloud.update();
                cloud.draw();
            });
        }
        
        animationId = requestAnimationFrame(animateClouds);
    }
    
    // 暴露测试函数到全局作用域
    window.testCloudEffect = function() {
        startCloudSystem();
        setTimeout(stopCloudSystem, 15000);
    };

    // 添加这段代码确保云画布位置正确
    window.addEventListener('resize', function() {
        if (isCloudSystemActive) {
            repositionCloudCanvas();
        }
    });
})(); 