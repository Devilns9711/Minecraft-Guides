export default function ParticlesBackground() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 12}s`,
      animationDuration: `${8 + Math.random() * 16}s`,
      width: `${1 + Math.random() * 3}px`,
      height: `${1 + Math.random() * 3}px`,
      opacity: 0.2 + Math.random() * 0.5,
    },
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-mc-green animate-particle"
          style={p.style}
        />
      ))}
    </div>
  )
}