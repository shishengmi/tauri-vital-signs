import React, { useRef, useEffect } from "react";

const ECG_Canvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = (canvas.width = canvas.offsetWidth);
        const height = (canvas.height = canvas.offsetHeight);

        const bgColor = "#d8cebf"; // 背景色
        const lineColor = "lime"; // 心电图颜色
        const gridColor = "#ffffff"; // 网格颜色

        const lineWidth = 2;
        let currentX = 0;
        let previousY = height / 2;

        const ecgPattern: number[] = [0, 0, 5, 20, -15, 0, 0, 10, -5, 0, 0, 0];
        let patternIndex = 0;

        // 绘制背景网格
        const drawGrid = () => {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;

            // 横线（电压刻度）
            for (let y = 0; y < height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // 竖线（时间刻度）
            for (let x = 0; x < width; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
        };

        drawGrid(); // 初始绘制网格

        const draw = () => {
            const newY = height / 2 + ecgPattern[patternIndex % ecgPattern.length];

            // 擦除当前位置，仅覆盖背景+刻度
            ctx.fillStyle = bgColor;
            ctx.fillRect(currentX, 0, lineWidth, height);

            // 重新画该列刻度（只重绘那一条线内的）
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let y = 0; y < height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(currentX, y);
                ctx.lineTo(currentX + lineWidth, y);
                ctx.stroke();
            }
            for (let x = 0; x < width; x += 50) {
                if (x === currentX) {
                    ctx.beginPath();
                    ctx.moveTo(currentX, 0);
                    ctx.lineTo(currentX, height);
                    ctx.stroke();
                }
            }

            // 画 ECG 线段
            ctx.beginPath();
            ctx.moveTo(currentX, previousY);
            ctx.lineTo(currentX + lineWidth, newY);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            previousY = newY;
            currentX += lineWidth;
            patternIndex++;

            if (currentX >= width) {
                currentX = 0;
                previousY = height / 2;
                drawGrid(); // 重新画背景和刻度
            }

            requestAnimationFrame(draw);
        };

        draw();
    }, []);

    return (
        <div className="w-full h-full" style={{ backgroundColor: "#27323d" }}>
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};

export default ECG_Canvas;
