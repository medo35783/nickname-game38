export default function Stars() {
  const s = Array.from({length: 50}, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    sz: Math.random() * 2 + 0.4,
    d: Math.random() * 3,
    dur: Math.random() * 2 + 2
  }));
  return (
    <div className="stars">
      {s.map(st => (
        <div key={st.id} className="star" style={{
          left: `${st.x}%`,
          top: `${st.y}%`,
          width: st.sz,
          height: st.sz,
          animationDelay: `${st.d}s`,
          animationDuration: `${st.dur}s`
        }}/>
      ))}
    </div>
  );
}
