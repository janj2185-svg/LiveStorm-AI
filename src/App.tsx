import './App.css';

const highlights = [
  'React + TypeScript foundation',
  'Vite development server',
  'Production build pipeline',
];

function App() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">New project</p>
        <h1>Build something focused, fast, and ready to grow.</h1>
        <p className="intro">
          This clean starter gives the project a lightweight frontend foundation
          with type checking, modern tooling, and room for the product direction
          to evolve.
        </p>

        <div className="actions" aria-label="Project actions">
          <a className="button button-primary" href="#start">
            Start building
          </a>
          <a className="button button-secondary" href="#stack">
            View stack
          </a>
        </div>
      </section>

      <section className="panel" id="stack" aria-labelledby="stack-title">
        <div>
          <p className="section-label">Foundation</p>
          <h2 id="stack-title">Everything needed for a clean first iteration.</h2>
        </div>

        <ul className="feature-list">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel-muted" id="start" aria-labelledby="start-title">
        <p className="section-label">Next step</p>
        <h2 id="start-title">Shape this starter around the real product.</h2>
        <p>
          Add routing, data access, authentication, or deployment once the project
          direction is defined.
        </p>
      </section>
    </main>
  );
}

export default App;
