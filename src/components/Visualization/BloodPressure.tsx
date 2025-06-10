const BloodPressure = () => {
  return (
    <div className="w-full h-full p-4 rounded-xl bg-gray-100">
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* 左侧田字格：2x2 区域 */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 col-span-2">
          {/* 高压单位 */}
          <div className="bg-white rounded shadow flex flex-col items-center justify-center p-2">
            <div className="text-xs text-gray-600">高压</div>
            <div className="text-xs text-gray-500">mmHg</div>
          </div>

          {/* 高压值 */}
          <div className="bg-white rounded shadow flex items-center justify-center p-2">
            <div className="text-4xl font-bold text-blue-700">118</div>
          </div>

          {/* 低压单位 */}
          <div className="bg-white rounded shadow flex flex-col items-center justify-center p-2">
            <div className="text-xs text-gray-600">低压</div>
            <div className="text-xs text-gray-500">mmHg</div>
          </div>

          {/* 低压值 */}
          <div className="bg-white rounded shadow flex items-center justify-center p-2">
            <div className="text-4xl font-bold text-red-600">78</div>
          </div>
        </div>

        {/* 右侧模拟汞柱 */}
        <div className="bg-white rounded shadow flex flex-col items-center justify-center p-2">
          <div className="text-sm mb-2 text-gray-700">模拟汞柱</div>
          <div className="w-4 h-40 bg-gradient-to-t from-blue-500 to-white rounded-full shadow-inner"></div>
        </div>
      </div>
    </div>
  );
};

export default BloodPressure;
