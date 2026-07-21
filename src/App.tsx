/**
 * App shell. Owned by: P3 (integration).
 * P3 wires the store (useReducer + persistence + scheduler) to P2's surfaces.
 */
function App() {
  return (
    <div className="phone-frame">
      <main className="surface">
        <h1>Pocket COO</h1>
        <p>Scaffold ready. See team/PLAN.md.</p>
      </main>
    </div>
  )
}

export default App
