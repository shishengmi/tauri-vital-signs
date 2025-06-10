const BodyTemperature = () => {
  return (
    <div className=" p-4 m-4 rounded-xl shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <img src="/img/body-tempture.png" alt="体温图标" className="w-8 h-8" />
        <div className="text-base font-semibold">体温</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-green-500">36.7℃</div>
      </div>
    </div>
  );
};

export default BodyTemperature;
