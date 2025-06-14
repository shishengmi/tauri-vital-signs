import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 定义LTTB数据点接口
interface LttbDataPoint {
  x: number;
  y: number;
}

// 组件属性接口
interface ECGCanvasProps {
  className?: string;
  refreshInterval?: number;
  pointSpace?: number;
  refreshBlockWidth?: number;
  minValue?: number;
  maxValue?: number;
}

/**
 * ECG心电图画布组件
 * 简化版本，只保留核心画布功能
 */
const ECG_Canvas: React.FC<ECGCanvasProps> = ({
  className = '',
  refreshInterval = 50,
  pointSpace = 2,
  refreshBlockWidth = 20,
  minValue = 110000,
  maxValue = 160000
}) => {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const ekgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  // ECG数据队列
  const ecgDataQueue = useRef<number[]>([]);
  const offsetRef = useRef(2);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 设置画布尺寸
  const setCanvasSize = useCallback(() => {
    if (!canvasRootRef.current) return;
    const { width, height } = canvasRootRef.current.getBoundingClientRect();
    setCanvasWidth(Math.floor(width));
    setCanvasHeight(Math.floor(height));
  }, []);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#0a4a2a';
    ctx.lineWidth = 1;
    const cellSize = 25; // 使用固定的间距，确保是正方形
    const width = canvasWidth;
    const height = canvasHeight;
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

    // 绘制垂直线
    for (let col = 0; col <= cols; col++) {
      let x = col * cellSize;
      if (col === cols) {
        x -= cellSize * 0.3;
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 绘制水平线
    for (let row = 0; row <= rows; row++) {
      let y = row * cellSize;
      if (row === rows) {
        y -= cellSize * 0.3;
      }
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.stroke();
  }, [canvasWidth, canvasHeight]);

  // 绘制ECG数据点
  // 绘制ECG数据点
  const drawEKGPoint = useCallback((ctx: CanvasRenderingContext2D, num: number) => {
    const canvasRange = canvasHeight * 0.8; // 只使用画布高度的80%，留出上下各10%的空白
    const maxOffset = canvasWidth / pointSpace;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    // 限制数值范围
    if (num > maxValue) num = maxValue;
    if (num < minValue) num = minValue;

    // 将num值从[minValue, maxValue]范围映射到[canvasHeight*0.8, 0]范围
    const scaledNum = ((num - minValue) / (maxValue - minValue)) * canvasRange;
    // Y坐标调整，使数值小的在画布下方，数值大的在画布上方，并添加10%的上下边距
    const yPos = (canvasHeight * 0.1) + (canvasHeight * 0.8 - scaledNum);

    // 清除即将更新的区域
    ctx.clearRect(offsetRef.current * pointSpace, 0, refreshBlockWidth, canvasHeight);
    offsetRef.current += 4;
    ctx.lineTo(offsetRef.current * pointSpace, yPos);
    ctx.stroke();

    // 重置偏移量
    if (offsetRef.current > maxOffset) {
      offsetRef.current = 2;
      ctx.beginPath();
    }
  }, [canvasHeight, canvasWidth, pointSpace, refreshBlockWidth, minValue, maxValue]);
  // 获取ECG数据
  const fetchECGData = useCallback(async () => {
    try {
      const data = await invoke<LttbDataPoint[]>('get_lttb_compressed_data');
      if (data && data.length > 0) {
        // 将LTTB数据转换为原始ECG数值
        const rawValues = data.map(point => {
          // 将归一化的y值(-1到1)转换回原始范围
          return minValue + (point.y + 1) * (maxValue - minValue) / 2;
        });
        ecgDataQueue.current.push(...rawValues);
      } else {
        // 没有数据时添加0值
        ecgDataQueue.current.push(0);
      }
    } catch (err) {
      console.error('获取ECG数据失败:', err);
      // 获取数据失败时添加0值
      ecgDataQueue.current.push(0);
    }
  }, [minValue, maxValue]);

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    setCanvasSize();
    const gridCtx = gridCanvasRef.current?.getContext('2d');
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    
    setTimeout(() => {
      if (!gridCtx || !ekgCtx) return;
      gridCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      ekgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawGrid(gridCtx);
    }, 0);
  }, [setCanvasSize, canvasWidth, canvasHeight, drawGrid]);

  // 开始/停止监测
  const toggleMonitoring = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // 重置数据函数
  const resetData = useCallback(() => {
    // 1. 停止所有定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // 2. 清空数据队列
    ecgDataQueue.current = [];
    
    // 3. 重置所有位置和状态
    offsetRef.current = 2;
    
    // 4. 获取所有画布上下文
    const gridCtx = gridCanvasRef.current?.getContext('2d');
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    
    // 5. 完全清除所有画布内容
    if (gridCtx) {
      gridCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      // 重新绘制网格
      drawGrid(gridCtx);
    }
    
    if (ekgCtx) {
      ekgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      // 重置绘图状态
      ekgCtx.beginPath();
      ekgCtx.moveTo(offsetRef.current * pointSpace, canvasHeight / 2);
      
      // 重新启动绘制定时器
      intervalRef.current = setInterval(() => {
        if (ecgDataQueue.current.length > 0) {
          const num = ecgDataQueue.current.shift() as number;
          drawEKGPoint(ekgCtx, num);
        }
      }, refreshInterval);
    }
    
    // 不停止监测状态，只重置画布和数据
    // setIsRunning(false);
  }, [canvasWidth, canvasHeight, drawGrid, pointSpace, refreshInterval, drawEKGPoint]);

  // 初始化画布
  useEffect(() => {
    setCanvasSize();
    const gridCtx = gridCanvasRef.current?.getContext('2d');
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');

    setTimeout(() => {
      if (!gridCtx || !ekgCtx) return;
      drawGrid(gridCtx);
      // 初始化ECG画布的绘图状态
      ekgCtx.beginPath();
    }, 0);

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawGrid, handleResize]);

  // 数据获取定时器
  useEffect(() => {
    if (!isRunning) return;

    const fetchInterval = setInterval(fetchECGData, 1000); // 每秒获取一次新数据
    return () => clearInterval(fetchInterval);
  }, [isRunning, fetchECGData]);

  // ECG绘制定时器
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    if (!ekgCtx) return;

    // 确保ECG画布有正确的绘图状态
    ekgCtx.beginPath();
    ekgCtx.moveTo(offsetRef.current * pointSpace, canvasHeight / 2);

    intervalRef.current = setInterval(() => {
      if (ecgDataQueue.current.length > 0) {
        const num = ecgDataQueue.current.shift() as number;
        drawEKGPoint(ekgCtx, num);
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, refreshInterval, drawEKGPoint, canvasHeight, pointSpace]);

  return (
    <div className={`w-full h-full bg-black ${className}`}>
      {/* ECG画布容器 */}
      <div 
        ref={canvasRootRef}
        className="w-full h-full relative border border-gray-600"
      >
        {/* 网格画布 */}
        <canvas
          ref={gridCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute left-0 top-0"
        />
        
        {/* ECG数据画布 */}
        <canvas
          ref={ekgCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute left-0 top-0"
        />
        
        {/* 简单控制按钮 */}
        <div className="absolute top-4 left-4 space-x-2">
          <button
            onClick={toggleMonitoring}
            className={`px-3 py-1 text-sm rounded ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? '停止' : '开始'}
          </button>
          
          <button
            onClick={resetData}
            disabled={!isRunning}
            className={`px-3 py-1 text-sm rounded ${isRunning 
              ? 'bg-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ECG_Canvas;