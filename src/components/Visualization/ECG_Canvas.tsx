import React, { useRef, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVitalSigns } from '@/hooks/useVitalSigns';

interface LttbDataPoint {
  x: number;
  y: number;
}

interface ECGCanvasProps {
  width?: number;
  height?: number;
  scrollSpeed?: number;
  timeWindow?: number;
}

const ECG_Canvas: React.FC<ECGCanvasProps> = ({
  width = 800,
  height = 300,
  scrollSpeed = 100,
  timeWindow = 10
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const scrollOffsetRef = useRef<number>(0);

  // 调试相关状态
  const debugInfoRef = useRef({
    frameCount: 0,
    lastFpsUpdate: 0,
    fps: 0,
    dataFetchCount: 0,
    lastDataFetch: 0,
    renderTime: 0,
    dataProcessingTime: 0
  });

  // 数据状态
  const [ecgData, setEcgData] = useState<LttbDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataStats, setDataStats] = useState({ points: 0, compressionRatio: 0 });

  // 获取实时数据状态
  const { data: vitalSigns, isLoading, error } = useVitalSigns(50);

  // 画布样式配置 - 移到组件外部避免重新创建
  const configRef = useRef({
    bgColor: '#0a0a0a',
    gridColor: '#1a4a1a',
    waveColor: '#00ff41',
    alertColor: '#ff4444',
    textColor: '#ffffff',
    gridMajorColor: '#2a5a2a',
    sweepLineColor: '#ffff00'
  });

  // 获取LTTB压缩数据 - 稳定化函数引用
  const fetchLttbData = useCallback(async () => {
    const startTime = performance.now();
    try {
      console.group('🔄 ECG数据获取');
      console.log('📊 开始获取LTTB压缩数据...');

      const compressedData: LttbDataPoint[] = await invoke('get_lttb_compressed_data');
      const fetchTime = performance.now() - startTime;

      debugInfoRef.current.dataFetchCount++;
      debugInfoRef.current.lastDataFetch = Date.now();
      debugInfoRef.current.dataProcessingTime = fetchTime;

      if (compressedData.length > 0) {
        console.log('✅ 数据获取成功:', {
          dataPoints: compressedData.length,
          fetchTime: `${fetchTime.toFixed(2)}ms`,
          firstPoint: compressedData[0],
          lastPoint: compressedData[compressedData.length - 1],
          dataRange: {
            xMin: Math.min(...compressedData.map(p => p.x)),
            xMax: Math.max(...compressedData.map(p => p.x)),
            yMin: Math.min(...compressedData.map(p => p.y)),
            yMax: Math.max(...compressedData.map(p => p.y))
          }
        });

        setEcgData(compressedData);
        setIsConnected(true);

        const newStats = {
          points: compressedData.length,
          compressionRatio: compressedData.length > 0 ? 1000 / compressedData.length : 0
        };
        setDataStats(newStats);

        console.log('📈 数据统计:', {
          totalPoints: newStats.points,
          compressionRatio: `${newStats.compressionRatio.toFixed(1)}:1`,
          estimatedOriginalPoints: Math.round(newStats.points * newStats.compressionRatio),
          compressionEfficiency: `${((1 - 1 / newStats.compressionRatio) * 100).toFixed(1)}%`
        });
      } else {
        console.warn('⚠️ 获取到空数据');
        setIsConnected(false);
      }
    } catch (err) {
      console.error('❌ 获取LTTB数据失败:', {
        error: err,
        fetchTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        fetchCount: debugInfoRef.current.dataFetchCount
      });
      setIsConnected(false);
    } finally {
      console.groupEnd();
    }
  }, []); // 移除所有依赖，使函数引用稳定

  // 绘制函数 - 使用useCallback稳定引用
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const config = configRef.current;

    // 主网格线（粗线）
    ctx.strokeStyle = config.gridMajorColor;
    ctx.lineWidth = 1;

    // 水平主网格线（每50像素）
    for (let y = 0; y <= h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 垂直主网格线（每100像素，代表1秒）
    for (let x = 0; x <= w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 细网格线
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = 0.5;

    // 水平细网格线（每10像素）
    for (let y = 0; y <= h; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 垂直细网格线（每20像素，代表0.2秒）
    for (let x = 0; x <= w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 中心基线
    ctx.strokeStyle = config.gridMajorColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, []);

  // 绘制ECG波形 - 优化数据访问
  // 绘制ECG波形 - 修复时间窗口过滤逻辑
  const drawECGWave = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, scrollOffset: number, data: LttbDataPoint[]) => {
    if (data.length < 2) {
      console.log('⚠️ ECG数据不足，跳过绘制 (需要至少2个数据点)');
      return;
    }

    const drawStartTime = performance.now();
    const config = configRef.current;

    // 计算显示范围
    const pixelsPerSecond = scrollSpeed;

    // 数据归一化参数
    const centerY = h / 2;
    const amplitudeScale = h * 0.3;

    ctx.strokeStyle = config.waveColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 开始绘制路径
    ctx.beginPath();
    let pathStarted = false;
    let visiblePoints = 0;

    // 修复：使用数据的实际时间范围而不是当前时间
    if (data.length === 0) return;

    // 获取数据的时间范围
    const dataStartTime = Math.min(...data.map(p => p.x));
    const dataEndTime = Math.max(...data.map(p => p.x));
    const dataTimeSpan = dataEndTime - dataStartTime;

    // 如果数据时间跨度很小，使用数据的相对时间
    const useRelativeTime = dataTimeSpan < timeWindow * 1000;

    for (let i = 0; i < data.length - 1; i++) {
      const point = data[i];
      const nextPoint = data[i + 1];

      let x1, x2;

      if (useRelativeTime) {
        // 使用相对时间：将数据映射到整个画布宽度
        const relativePos1 = (point.x - dataStartTime) / dataTimeSpan;
        const relativePos2 = (nextPoint.x - dataStartTime) / dataTimeSpan;
        x1 = relativePos1 * w;
        x2 = relativePos2 * w;
      } else {
        // 使用绝对时间窗口
        const currentTime = Date.now();
        const timeWindowMs = timeWindow * 1000;
        const startTime = currentTime - timeWindowMs;

        // 时间过滤：只显示时间窗口内的数据
        if (point.x < startTime) continue;

        const relativeTime = (point.x - startTime) / 1000;
        const nextRelativeTime = (nextPoint.x - startTime) / 1000;

        x1 = relativeTime * pixelsPerSecond;
        x2 = nextRelativeTime * pixelsPerSecond;
      }

      const y1 = centerY - (point.y * amplitudeScale);
      const y2 = centerY - (nextPoint.y * amplitudeScale);

      // 只绘制在可见区域内的线段
      if ((x1 >= -50 && x1 <= w + 50) || (x2 >= -50 && x2 <= w + 50)) {
        if (!pathStarted) {
          ctx.moveTo(x1, y1);
          pathStarted = true;
        }
        ctx.lineTo(x2, y2);
        visiblePoints++;
      }
    }

    ctx.stroke();

    const drawTime = performance.now() - drawStartTime;
    debugInfoRef.current.renderTime = drawTime;

    // 每100帧输出一次绘制统计
    if (debugInfoRef.current.frameCount % 100 === 0) {
      console.log('🎨 绘制统计:', {
        totalDataPoints: data.length,
        visiblePoints,
        renderTime: `${drawTime.toFixed(2)}ms`,
        scrollOffset: scrollOffset.toFixed(2),
        amplitudeScale,
        centerY,
        timeWindow: `${timeWindow}s`,
        useRelativeTime,
        dataTimeSpan: `${dataTimeSpan}ms`,
        currentTime: new Date().toLocaleTimeString()
      });
    }
  }, [scrollSpeed, timeWindow]);

  // 绘制扫描线
  const drawSweepLine = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, scrollOffset: number) => {
    const config = configRef.current;
    const sweepX = (scrollOffset % w);

    // 扫描线
    ctx.strokeStyle = config.sweepLineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, h);
    ctx.stroke();

    // 扫描线后的清除效果（黑色区域）
    const clearWidth = 20;
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(sweepX + 2, 0, clearWidth, h);
  }, []);

  // 绘制状态信息
  const drawStatusInfo = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number,
    connectionStatus: boolean, stats: typeof dataStats, vitals: typeof vitalSigns,
    _loadingStatus: boolean, errorMsg: string | null) => {
    const config = configRef.current;

    ctx.fillStyle = config.textColor;
    ctx.font = '12px Arial';

    // 连接状态
    const statusText = connectionStatus ? '已连接' : '未连接';
    const statusColor = connectionStatus ? config.waveColor : config.alertColor;
    ctx.fillStyle = statusColor;
    ctx.fillText(`状态: ${statusText}`, 10, 20);

    // 数据统计
    ctx.fillStyle = config.textColor;
    ctx.fillText(`数据点: ${stats.points}`, 10, 40);
    ctx.fillText(`压缩比: ${stats.compressionRatio.toFixed(1)}:1`, 10, 60);

    // 实时心率
    if (vitals) {
      ctx.fillText(`心率: ${vitals.heart_rate.toFixed(1)} bpm`, 10, 80);
      ctx.fillText(`RR间隔: ${vitals.rr_interval.toFixed(3)} s`, 10, 100);
    }

    // 性能信息
    ctx.fillText(`FPS: ${debugInfoRef.current.fps}`, 10, 120);
    ctx.fillText(`渲染时间: ${debugInfoRef.current.renderTime.toFixed(1)}ms`, 10, 140);

    // 滚动速度
    ctx.fillText(`滚动速度: ${scrollSpeed} px/s`, 10, h - 60);
    ctx.fillText(`时间窗口: ${timeWindow} s`, 10, h - 40);

    // 错误信息
    if (errorMsg) {
      ctx.fillStyle = config.alertColor;
      ctx.fillText(`错误: ${errorMsg}`, w - 200, h - 20);
    }
  }, [scrollSpeed, timeWindow]);

  // 定期获取数据 - 独立的effect
  useEffect(() => {
    console.log('🚀 ECG Canvas 数据获取初始化');

    const interval = setInterval(() => {
      fetchLttbData();

      // 每5秒输出一次性能统计
      if (debugInfoRef.current.dataFetchCount % 50 === 0) {
        console.log('📊 性能统计 (每5秒):', {
          fps: debugInfoRef.current.fps,
          dataFetchCount: debugInfoRef.current.dataFetchCount,
          avgRenderTime: `${debugInfoRef.current.renderTime.toFixed(2)}ms`,
          avgDataProcessingTime: `${debugInfoRef.current.dataProcessingTime.toFixed(2)}ms`,
          connectionStatus: isConnected ? '已连接' : '未连接',
          currentDataPoints: ecgData.length
        });
      }
    }, 100);

    return () => {
      clearInterval(interval);
      console.log('🛑 ECG Canvas 数据获取清理');
    };
  }, [fetchLttbData]); // 只依赖稳定的fetchLttbData

  // 动画循环 - 独立的effect，最小化依赖
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('🎬 启动动画循环');
    console.log('📐 画布尺寸设置:', { width, height });

    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;

    const animate = (currentTime: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 计算FPS
      debugInfoRef.current.frameCount++;
      if (currentTime - debugInfoRef.current.lastFpsUpdate >= 1000) {
        debugInfoRef.current.fps = Math.round(debugInfoRef.current.frameCount * 1000 / (currentTime - debugInfoRef.current.lastFpsUpdate));
        debugInfoRef.current.frameCount = 0;
        debugInfoRef.current.lastFpsUpdate = currentTime;

        if (debugInfoRef.current.fps < 30) {
          console.warn('⚠️ FPS过低:', {
            fps: debugInfoRef.current.fps,
            performance: '需要优化'
          });
        }
      }

      // 计算时间差
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // 更新滚动偏移
      scrollOffsetRef.current += (scrollSpeed * deltaTime) / 1000;

      const renderStartTime = performance.now();

      // 清空画布
      ctx.fillStyle = configRef.current.bgColor;
      ctx.fillRect(0, 0, width, height);

      // 绘制网格
      drawGrid(ctx, width, height);

      // 绘制ECG波形 - 传递当前数据快照
      drawECGWave(ctx, width, height, scrollOffsetRef.current, ecgData);

      // 绘制扫描线
      drawSweepLine(ctx, width, height, scrollOffsetRef.current);

      // 绘制状态信息
      drawStatusInfo(ctx, width, height, isConnected, dataStats, vitalSigns, isLoading, error);

      debugInfoRef.current.renderTime = performance.now() - renderStartTime;

      // 继续动画
      animationRef.current = requestAnimationFrame(animate);
    };

    // 启动动画循环
    lastTimeRef.current = performance.now();
    debugInfoRef.current.lastFpsUpdate = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log('🛑 动画循环已停止');
      }
    };
  }, [width, height, scrollSpeed, drawGrid, drawECGWave, drawSweepLine, drawStatusInfo]); // 只包含真正需要的依赖

  // 监听数据变化 - 独立的effect
  useEffect(() => {
    if (vitalSigns) {
      console.log('💗 生命体征数据更新:', {
        heartRate: `${vitalSigns.heart_rate.toFixed(1)} bpm`,
        rrInterval: `${vitalSigns.rr_interval.toFixed(3)} s`,
        bodyTemperature: `${vitalSigns.body_temperature.toFixed(1)}°C`,
        bloodOxygen: `${vitalSigns.blood_oxygen}%`,
        timestamp: new Date(parseInt(vitalSigns.timestamp)).toLocaleTimeString()
      });
    }
  }, [vitalSigns]);

  // 监听连接状态变化 - 独立的effect
  useEffect(() => {
    console.log('🔗 连接状态变化:', {
      isConnected,
      dataPoints: ecgData.length,
      compressionRatio: dataStats.compressionRatio.toFixed(1)
    });
  }, [isConnected, ecgData.length, dataStats.compressionRatio]);

return (
  <div className="w-full h-full bg-gray-900 rounded-lg p-2">
    {/* 放大的画布区域 */}
    <div className="border border-gray-600 rounded overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ backgroundColor: configRef.current.bgColor }}
      />
    </div>

    {/* 精简的状态栏 */}
    <div className="mt-1 flex justify-between items-center text-xs text-gray-400">
      <div className={`${isConnected ? 'text-green-400' : 'text-red-400'}`}>
        {isConnected ? '已连接' : '未连接'}
      </div>
      {vitalSigns && (
        <div className="text-green-400">
          {vitalSigns.heart_rate.toFixed(0)} bpm
        </div>
      )}
    </div>
  </div>
);
};

export default ECG_Canvas;