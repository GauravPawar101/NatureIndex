export default function StitchBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <motion.div className="absolute inset-0 bg-[var(--surface)]" />
      <div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-30 blur-[100px] animate-pulse"
        style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full opacity-25 blur-[100px] animate-pulse [animation-delay:1s]"
        style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #571bc1 0%, transparent 70%)' }}
      />
    </motion.div>
  );
}
