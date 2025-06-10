import ECG_Data from "@/components/Visualization/ECG_Data";
import BloodOxygen from "../components/Visualization/BloodOxygen";
import BloodPressure from "../components/Visualization/BloodPressure";
import BodyTemperature from "../components/Visualization/BodyTemperature";
import ECG_Canvas from "../components/Visualization/ECG_Canvas";
import Evaluate from "../components/Visualization/Evaluate";
import PatientInfo from "../components/Visualization/PatientInfo";

const Home = () => {
  return (
    <div className="grid grid-cols-3 gap-4 h-full p-4 text-base bg-gradient-to-r from-emerald-900 to-emerald-950">
      {/* 左侧：基础指标区域 */}
      <div className="rounded-lg p-4 flex flex-col gap-4 shadow-lg bg-gray-800 text-white">
        {/* <h2 className="text-xl font-bold">基础指标</h2> */}
        <div className="p-4 rounded shadow-md bg-gray-900"><Evaluate></Evaluate></div>
        <div className="p-4 rounded shadow-md bg-gray-900">
          <h2>心电图</h2>
          <div className="w-full h-[300px] " id="ecg"><ECG_Canvas></ECG_Canvas></div>
        </div>
        <div className="p-4 rounded shadow-md flex-1 flex flex-col gap-2 bg-gray-900">
          {/* 三等分剩下的空间 */}
          <div className="flex gap-2 flex-1 bg-gray-900">
            <ECG_Data></ECG_Data>
          </div>
        </div>
      </div>

      {/* 中间：人体模型区域 */}
      <div className="bg-base-200 rounded-lg p-4 flex flex-col items-center justify-center shadow bg-gray-800 text-white">
        {/* <h2 className="text-xl font-bold mb-4">中间容器</h2> */}
        <div className="w-full h-full rounded flex items-center justify-center shadow-md">
          {/* 这里放人体图/模型 */}
          {/* public\Veins_Medical_Diagram_clip_art.svg */}
          <img
            src="/Veins_Medical_Diagram_clip_art.svg"
            alt="人体模型"
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* 右侧：用户信息与总结 */}
      <div className="bg-base-200 rounded-lg p-4 flex flex-col gap-4 shadow bg-gray-800 text-white">
        {/* <h2 className="text-xl font-bold">用户信息</h2> */}
        <div className="bg-base-100 p-4 rounded shadow-md flex-1 bg-gray-900"><PatientInfo name="张三" gender="男" age={45} height={172} weight={68} /></div>
        <div className="bg-base-100 p-4 rounded shadow-md flex-1 bg-gray-900"><BloodPressure /></div>
        <div className="bg-base-100 p-4 rounded shadow-md flex bg-gray-900">
          <div className="w-1/2 "><BodyTemperature></BodyTemperature></div>
          <div className="w-1/2 "><BloodOxygen></BloodOxygen></div>
        </div>
      </div>
    </div>
  ); 
};

export default Home;

