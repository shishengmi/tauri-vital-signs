import { useEffect, useState } from "react";
import { useVitalSigns } from "@/hooks/useVitalSigns";

/* ---------- 灵敏版线性算法 ---------- */
const linearScore = (v: number, low: number, high: number, k: number) => {
  if (v >= low && v <= high) return 100;
  const delta = v < low ? low - v : v - high;
  return Math.max(0, 100 - delta * k);
};

const calcScore = (vital: ReturnType<typeof useVitalSigns>["data"]) => {
  if (!vital) return NaN;
  const { body_temperature, blood_oxygen, heart_rate, rr_interval, systolic, diastolic } = vital;

  const temp = linearScore(body_temperature, 36.3, 37.0, 60);
  const spo2 = linearScore(blood_oxygen, 96, 100, 10);
  const hr   = linearScore(heart_rate, 60, 90, 3);
  const rr   = linearScore(rr_interval, 650, 950, 0.15);
  const bp   =
    systolic && diastolic
      ? (linearScore(systolic, 100, 135, 1.5) + linearScore(diastolic, 65, 85, 1.5)) / 2
      : 100;

  const score =
    temp * 0.18 +
    spo2 * 0.25 +
    hr   * 0.20 +
    rr   * 0.12 +
    bp   * 0.25;

  return Math.round(score * 10) / 10; // 一位小数
};

const gradeFromScore = (s: number) =>
  s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "E";

/* ---------- 仅文本颜色映射 ---------- */
const textColorMap: Record<string, string> = {
  A: "text-green-500",
  B: "text-lime-500",
  C: "text-yellow-500",
  D: "text-orange-500",
  E: "text-red-500",
  "-": "text-gray-500",
};

/* ---------- 组件 ---------- */
const Evaluate = () => {
  const refreshInterval = 1000;
  const { data } = useVitalSigns(refreshInterval);

  const [scoreText, setScoreText] = useState("--");
  const [gradeText, setGradeText] = useState("-");

  useEffect(() => {
    const update = () => {
      if (!data) {
        setScoreText("--");
        setGradeText("-");
        return;
      }
      const score = calcScore(data);
      setScoreText(isNaN(score) ? "--" : score.toFixed(1));
      setGradeText(gradeFromScore(score));
      console.log("人体综合指数得分：", score);
    };

    update();
    const id = setInterval(update, refreshInterval);
    return () => clearInterval(id);
  }, [data, refreshInterval]);

  /* 取对应文字颜色；默认灰色 */
  const textClass = textColorMap[gradeText] ?? textColorMap["-"];

  return (
    <div className="text-base p-4 rounded-xl flex flex-col space-y-2 shadow-lg">
      {/* 主体内容 */}
      <div className="flex space-x-4">
        {/* 图标 */}
        <img
          src="/img/person-icon.png"
          alt="人体图标"
          className="w-10 h-20"
        />

        <div className="flex w-full">
          {/* 分数卡片 */}
          <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">
            <div className={`text-4xl font-bold ${textClass}`}>{scoreText}</div>
            <div className="text-xm text-gray-400">人体综合指数</div>
          </div>
          <div className="divider divider-horizontal"></div>
          {/* 评级卡片 */}
          <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">
            <p className={`text-5xl font-bold ${textClass}`}>{gradeText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluate;
