const BloodOxygen = () => {
  return (
    <div className=" p-4 m-4 border rounded-xl shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <img src="/img/blood-oxygen.png" alt="血氧图标" className="w-8 h-8" />
        <div className="text-base font-semibold">血氧</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-blue-500">98%</div>
      </div>
    </div>
  );
};

export default BloodOxygen;
