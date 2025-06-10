const ECG_Data = () => {
    const data = [
        { label: "心率", value: "89.2", unit: "bpm" },
        { label: "心率变异性", value: "23.4", unit: "ms" },
        { label: "PR间隔", value: "10.2", unit: "ms" }
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {data.map((item, index) => (
                <div
                    key={index}
                    className="bg-white flex flex-1 flex-row shadow-md justify-around"
                >
                    <div className="text-gray-600 text-sm font-medium">{item.label}</div>
                    <div className="text-blue-500 text-3xl font-extrabold">{item.value}</div>
                    <div className="text-gray-500 text-sm font-medium">{item.unit}</div>
                </div>
            ))}
        </div>
    );
};

export default ECG_Data;
