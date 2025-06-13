
const Spinner = ({ size = 'h-8 w-8', color = 'border-accent' }) => {
  return (
    <div className={`animate-spin rounded-full ${size} ${color} border-t-transparent border-solid border-4`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
