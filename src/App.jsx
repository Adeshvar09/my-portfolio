import { useEffect, useRef, useState } from 'react';
import MercuryOrbit from './components/MercuryOrbit.jsx';

const projects = [
  { n: '01', name: 'WEBOCLYPSE', type: 'STARTUP / WEB PLATFORM', desc: 'Building a sharper experience for the modern web.', year: '2026', mark: 'W' },
  { n: '02', name: 'CYBERHERO', type: 'WEB APPLICATION', desc: 'A practical exploration of security, interfaces and full-stack development.', year: '2026', mark: 'C' },
  { n: '03', name: 'PORTFOLIO 01', type: 'PERSONAL / EXPERIMENT', desc: 'An evolving space for experiments, ideas and things worth building.', year: '2026', mark: 'A' },
];

function SectionLabel({ number, children }) {
  return <div className="section-label"><span>{number}</span><i />{children}</div>;
}

export default function App() {
  const [active, setActive] = useState('home');
  const [clock, setClock] = useState('');
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
    update();
    const timer = setInterval(update, 30000);
    const move = (e) => { pointer.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { clearInterval(timer); window.removeEventListener('pointermove', move); };
  }, []);

  const go = (id) => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <main>
      <div className="grain" />
      <aside className="rail">
        <a className="monogram" href="#home" onClick={(e) => { e.preventDefault(); go('home'); }}>AL<span>.</span></a>
        <div className="rail-line" />
        <nav aria-label="Main navigation">
          {[['home','01'],['about','02'],['work','03'],['contact','04']].map(([id,num]) =>
            <button key={id} className={active === id ? 'rail-link active' : 'rail-link'} onClick={() => go(id)} aria-label={`Go to ${id}`}>
              <span>{num}</span><b>{id}</b>
            </button>
          )}
        </nav>
        <div className="rail-bottom"><span className="status-dot" />AVAILABLE<br/>FOR OPPORTUNITIES</div>
      </aside>

      <header className="topbar">
        <div className="top-location"><span className="status-dot" /> INDEPENDENT DEVELOPER <span className="top-divider">/</span> INDIA</div>
        <div className="top-right"><span>LOCAL TIME</span><strong>{clock || '––:––'} IST</strong></div>
      </header>

      <div className="page">
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> PORTFOLIO / 2026</div>
            <h1>Making<br/>the <em>digital</em><br/>feel tangible<span className="period">.</span></h1>
            <p className="hero-intro">I'm <strong>Adeshvar Linkam</strong> — a developer and builder exploring the space between thoughtful engineering and distinctive digital experiences.</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={() => go('work')}>EXPLORE MY WORK <span>↗</span></button>
              <button className="text-link" onClick={() => go('contact')}>LET'S CONNECT <span>↗</span></button>
            </div>
            <div className="hero-index"><span>SCROLL TO EXPLORE</span><div className="scroll-track"><i /></div><span>01 — 04</span></div>
          </div>
          <div className="hero-art" aria-label="Interactive liquid mercury orbital sculpture">
            <div className="art-topline"><span>FORM STUDY Nº 001</span><span>INTERACTIVE OBJECT</span></div>
            <MercuryOrbit />
            <div className="art-caption"><span>01 / ORBITAL STUDY</span><span>MOVE YOUR CURSOR TO INTERACT</span></div>
            <div className="art-coordinate">13°04' N<br/>80°16' E</div>
          </div>
          <div className="hero-bottom-rule"><span>DESIGNING / BUILDING / LEARNING</span><span>SCROLL ↓</span></div>
        </section>

        <section className="about section" id="about">
          <SectionLabel number="01">A LITTLE ABOUT ME</SectionLabel>
          <div className="about-grid">
            <h2>Curiosity,<br/><span>made practical.</span></h2>
            <div className="about-copy">
              <p>I enjoy understanding how things work, then using that understanding to build things that are useful, considered and a little different.</p>
              <p>Currently sharpening my foundations in software development, problem solving and the tools that turn ideas into working products.</p>
              <div className="meta-grid"><div><small>FOCUS</small><b>WEB DEVELOPMENT · DSA</b></div><div><small>CURRENTLY BUILDING</small><b>WEBOCLYPSE · PERSONAL PROJECTS</b></div></div>
            </div>
          </div>
          <div className="skills-strip"><span>THE TOOLKIT</span><div>REACT <i>✳</i> JAVASCRIPT <i>✳</i> PYTHON <i>✳</i> HTML / CSS <i>✳</i> GIT & GITHUB <i>✳</i> NODE.JS</div></div>
        </section>

        <section className="work section" id="work">
          <SectionLabel number="02">SELECTED WORK</SectionLabel>
          <div className="work-heading"><h2>Things I've<br/><em>put into motion.</em></h2><p>A selection of projects, experiments<br/>and ongoing explorations.</p></div>
          <div className="project-list">
            {projects.map(p => <article className="project" key={p.n}>
              <span className="project-number">{p.n}</span>
              <div className="project-mark">{p.mark}</div>
              <div className="project-info"><small>{p.type}</small><h3>{p.name}</h3><p>{p.desc}</p></div>
              <span className="project-year">{p.year}</span><span className="project-arrow">↗</span>
            </article>)}
          </div>
          <p className="project-note">PROJECT DETAILS AND LINKS WILL BE ADDED AS EACH BUILD IS READY TO SHOW.</p>
        </section>

        <section className="contact section" id="contact">
          <SectionLabel number="03">MAKE SOMETHING MATTER</SectionLabel>
          <div className="contact-main"><h2>Have an idea?<br/><em>Let's build it.</em></h2><a className="contact-link" href="mailto:hello@example.com">GET IN TOUCH <span>↗</span></a></div>
          <div className="contact-foot"><span>OPEN TO COLLABORATION & OPPORTUNITIES</span><span>CHENNAI, INDIA</span></div>
        </section>
        <footer><span>© 2026 ADESHV​AR LINKAM</span><span>DESIGNED WITH INTENTION. BUILT WITH CURIOSITY.</span><a href="#home" onClick={(e) => { e.preventDefault(); go('home'); }}>BACK TO TOP ↑</a></footer>
      </div>
    </main>
  );
}
