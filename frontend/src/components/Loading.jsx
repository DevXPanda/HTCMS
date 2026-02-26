const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="spinner spinner-md mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default Loading;
