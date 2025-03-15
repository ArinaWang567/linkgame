// 立即执行函数，修复分数递减效果
(function() {
    // 直接测试分数递减效果
    function fixScoreDecrease() {
        console.log("安装分数递减效果修复");
        
        // 重新定义分数递减函数，确保完全独立工作
        window.showScoreDecrease = function(startScore) {
            // 如果没有提供分数，使用当前分数
            if (typeof startScore !== 'number') {
                const scoreElement = document.getElementById('score');
                startScore = scoreElement ? parseInt(scoreElement.textContent) || 100 : 100;
            }
            
            console.log("启动分数递减效果，从", startScore, "到0");
            
            // 显示游戏结束界面
            const gameOverBg = document.getElementById('gameOverBackground');
            const gameOverContent = document.getElementById('gameOverContent');
            
            if (!gameOverBg || !gameOverContent) {
                console.error("找不到游戏结束界面元素");
                return;
            }
            
            gameOverBg.style.display = 'block';
            gameOverContent.style.display = 'block';
            
            // 获取分数显示元素
            const finalScoreElement = document.getElementById('finalScore');
            if (!finalScoreElement) {
                console.error("找不到最终分数显示元素");
                return;
            }
            
            // 设置初始分数
            let currentDisplayScore = startScore;
            finalScoreElement.textContent = currentDisplayScore;
            
            // 计算减分速度
            const decreaseStep = Math.max(1, Math.ceil(startScore / 50)); // 约1秒完成
            
            // 开始递减动画
            const decreaseInterval = setInterval(function() {
                // 减少分数
                currentDisplayScore = Math.max(0, currentDisplayScore - decreaseStep);
                finalScoreElement.textContent = currentDisplayScore;
                
                // 输出调试信息
                console.log("当前显示分数:", currentDisplayScore);
                
                // 当分数接近或等于0时停止
                if (currentDisplayScore <= 0) {
                    clearInterval(decreaseInterval);
                    finalScoreElement.textContent = '0';
                    console.log("分数递减完成");
                }
            }, 20); // 50fps的更新频率
        };
        
        // 附加到原来的gameOver函数（如果存在）
        if (typeof window.gameOver === 'function') {
            const originalGameOver = window.gameOver;
            window.gameOver = function() {
                originalGameOver.apply(this, arguments);
                // 如果没有烟花效果，强制显示分数递减
                if (!document.getElementById('fireworksCanvas').style.display === 'block') {
                    window.showScoreDecrease();
                }
            };
            console.log("已修补gameOver函数");
        }
        
        console.log("分数递减效果修复已安装，可通过 showScoreDecrease(100) 测试");
    }
    
    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixScoreDecrease);
    } else {
        fixScoreDecrease();
    }
})(); 