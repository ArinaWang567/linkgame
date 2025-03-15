// 立即执行函数，解决云朵边界对齐问题
(function() {
    // 确保在DOM加载完成后执行
    function fixCloudAlignment() {
        const gameCanvas = document.getElementById('gameCanvas');
        const cloudCanvas = document.getElementById('smokeCanvas');
        
        if (!gameCanvas || !cloudCanvas) {
            console.error("找不到画布元素，将在0.5秒后重试");
            setTimeout(fixCloudAlignment, 500);
            return;
        }
        
        console.log("开始修复云朵边界对齐");
        
        // 直接强制对齐方法
        function forceAlignment() {
            // 获取游戏画布的精确位置和尺寸
            const rect = gameCanvas.getBoundingClientRect();
            
            // 强制设置云画布的样式，确保完全覆盖
            cloudCanvas.style.position = 'absolute';
            cloudCanvas.style.left = rect.left + 'px';
            cloudCanvas.style.top = rect.top + 'px';
            cloudCanvas.style.width = rect.width + 'px';
            cloudCanvas.style.height = rect.height + 'px';
            cloudCanvas.style.margin = '0';
            cloudCanvas.style.padding = '0';
            cloudCanvas.style.border = 'none';
            cloudCanvas.style.borderRadius = window.getComputedStyle(gameCanvas).borderRadius;
            cloudCanvas.style.pointerEvents = 'none';
            cloudCanvas.style.zIndex = '99';
            
            // 设置画布内部分辨率
            cloudCanvas.width = rect.width;
            cloudCanvas.height = rect.height;
            
            console.log("云朵边界已强制对齐:", rect.width, rect.height);
        }
        
        // 立即执行一次对齐
        forceAlignment();
        
        // 在所有可能导致布局变化的事件后重新对齐
        window.addEventListener('resize', forceAlignment);
        window.addEventListener('scroll', forceAlignment);
        window.addEventListener('orientationchange', forceAlignment);
        
        // 定期强制检查对齐（以防任何意外情况）
        setInterval(forceAlignment, 2000);
        
        // 在云效果开始时强制对齐
        const originalTestCloud = window.testCloudEffect;
        window.testCloudEffect = function() {
            forceAlignment();
            if (originalTestCloud) originalTestCloud();
        };
    }
    
    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixCloudAlignment);
    } else {
        fixCloudAlignment();
    }
})(); 