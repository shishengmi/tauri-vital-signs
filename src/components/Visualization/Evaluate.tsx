const Evaluate = () => {
  return (
    <div className=" text-base p-4 rounded-xl flex flex-col space-y-2 shadow-lg">
      {/* 主体内容 */}
      <div className="flex   space-x-4">
        {/* 图标 */}
        <img
          src="/img/person-icon.png"
          alt="人体图标"
          className="w-10 h-20 text-green-500"
        />

        <div className="flex w-full">
          <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">
            <div className="text-4xl font-bold text-green-500">102.67</div>
            <div className="text-xm text-gray-400">人体综合指数</div>
          </div>
          <div className="divider divider-horizontal"></div>
          <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">
            <p className="text-5xl text-green-500">A</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluate;
