---
layout: page
title: Education 
permalink: /education/
---


<style>
  .education-timeline {
    --timeline-panel: #1c2430;
    --timeline-card: #212b38;
    --timeline-card2: #1b232e;
    --timeline-line: #334052;
    --timeline-text: #eef3f8;
    --timeline-muted: #b5c0cc;
    --timeline-muted2: #93a1b2;
    --hs: #8d98a7;
    --csu: #5fbe7a;
    --cub: #d8b25f;
    --cud: #8eb6ff;

    max-width: 980px;
    margin: 0 auto;
    padding: 16px 18px 18px;
    position: relative;
    color: var(--timeline-text);
    background: linear-gradient(180deg, rgba(31, 39, 52, .92), rgba(22, 29, 38, .96));
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 22px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, .28);
  }

  .education-timeline::before {
    content: "";
    position: absolute;
    left: 40px;
    top: 18px;
    bottom: 18px;
    width: 3px;
    background: linear-gradient(
      180deg,
      rgba(141, 152, 167, .55),
      rgba(95, 190, 122, .55),
      rgba(142, 182, 255, .55)
    );
    border-radius: 999px;
  }

  .education-timeline .timeline-row {
    position: relative;
    display: grid;
    grid-template-columns: 54px 1fr;
    gap: 14px;
    align-items: start;
    padding: 9px 0;
  }

  .education-timeline .timeline-year {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(13, 17, 23, .92);
    border: 2px solid var(--accent);
    display: grid;
    place-items: center;
    color: var(--accent);
    font-weight: 700;
    font-size: 12px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, .18);
    z-index: 2;
  }

  .education-timeline .timeline-card {
    background: linear-gradient(180deg, rgba(33, 43, 56, .98), rgba(27, 35, 46, .98));
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 14px rgba(0, 0, 0, .14);
  }

  .education-timeline .timeline-school {
    padding: 10px 13px;
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--accent) 25%, #1f2937),
      color-mix(in oklab, var(--accent) 16%, #1b2430)
    );
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    font-size: 15px;
    font-weight: 700;
    line-height: 1.15;
    color: #fff;
  }

  .education-timeline .timeline-body {
    padding: 11px 13px 12px;
  }

  .education-timeline .timeline-body h3 {
    margin: 0 0 5px;
    font-size: 19px;
    line-height: 1.12;
    color: #fff;
    font-weight: 600;
  }

  .education-timeline .timeline-body p {
    margin: 0;
    color: var(--timeline-muted);
    font-size: 13px;
    line-height: 1.42;
  }

  .education-timeline .timeline-body p + p {
    margin-top: 6px;
  }

  .education-timeline .timeline-body p.bullet {
    position: relative;
    padding-left: 12px;
  }

  .education-timeline .timeline-body p.bullet::before {
    content: "•";
    position: absolute;
    left: 0;
    top: 0;
    color: var(--accent);
    font-weight: 700;
  }

  .education-timeline .hs { --accent: var(--hs); }
  .education-timeline .csu { --accent: var(--csu); }
  .education-timeline .cub { --accent: var(--cub); }
  .education-timeline .cud { --accent: var(--cud); }

  .education-timeline .current .timeline-card {
    border-style: dashed;
  }

  @media (max-width: 700px) {
    .education-timeline {
      padding: 14px 12px;
    }

    .education-timeline::before {
      left: 28px;
    }

    .education-timeline .timeline-row {
      grid-template-columns: 40px 1fr;
      gap: 10px;
    }

    .education-timeline .timeline-year {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: 10px;
    }

    .education-timeline .timeline-school {
      font-size: 14px;
    }

    .education-timeline .timeline-body h3 {
      font-size: 17px;
    }
  }
</style>

<section class="education-timeline" aria-label="Education timeline">
  <article class="timeline-row hs">
    <div class="timeline-year">2002</div>
    <div class="timeline-card">
      <div class="timeline-school">Fort Collins High School</div>
      <div class="timeline-body">
        <h3>High school diploma</h3>
        <p class="bullet">Graduated valedictorian in May 2002</p>
      </div>
    </div>
  </article>

  <article class="timeline-row csu">
    <div class="timeline-year">2007</div>
    <div class="timeline-card">
      <div class="timeline-school">Colorado State University</div>
      <div class="timeline-body">
        <h3>B.S. Electrical Engineering and Mathematics</h3>
        <p class="bullet">Double-majored in Electrical Engineering and Mathematics</p>
      </div>
    </div>
  </article>

  <article class="timeline-row cub">
    <div class="timeline-year">2008</div>
    <div class="timeline-card">
      <div class="timeline-school">University of Colorado Boulder</div>
      <div class="timeline-body">
        <h3>M.S. Electrical Engineering</h3>
        <p class="bullet">Concentration: Digital Signal Processing and Communications</p>
        <p class="bullet">GAANN Fellowship</p>
      </div>
    </div>
  </article>

  <article class="timeline-row cud">
    <div class="timeline-year">2012</div>
    <div class="timeline-card">
      <div class="timeline-school">University of Colorado Denver</div>
      <div class="timeline-body">
        <h3>M.S. Applied Mathematics</h3>
        <p class="bullet">Completed studies while working full-time as an electrical engineer</p>
      </div>
    </div>
  </article>

  <article class="timeline-row csu">
    <div class="timeline-year">2014</div>
    <div class="timeline-card">
      <div class="timeline-school">Colorado State University</div>
      <div class="timeline-body">
        <h3>M.S. Statistics</h3>
        <p class="bullet">Served as graduate teaching assistant and taught three introductory statistics courses</p>
        <p class="bullet">CIMS Fellowship and Williams Scholarship</p>
      </div>
    </div>
  </article>

  <article class="timeline-row cud">
    <div class="timeline-year">2018</div>
    <div class="timeline-card">
      <div class="timeline-school">University of Colorado Denver</div>
      <div class="timeline-body">
        <h3>Ph.D. Applied Mathematics</h3>
        <p class="bullet">Served as graduate teaching assistant and taught eight courses in mathematics and statistics</p>
        <p class="bullet">Dissertation: <em>Some Problems in Evolutionary Population Dynamics</em>; advisor: Dr. Burt Simon</p>
        <p class="bullet">Lynn Bateman Memorial Excellence in Teaching Award (2017)</p>
      </div>
    </div>
  </article>

  <article class="timeline-row csu">
    <div class="timeline-year">2024</div>
    <div class="timeline-card">
      <div class="timeline-school">Colorado State University</div>
      <div class="timeline-body">
        <h3>B.A. Philosophy</h3>
        <p class="bullet">Completed studies while working full-time as an assistant professor</p>
      </div>
    </div>
  </article>

  <article class="timeline-row csu current">
    <div class="timeline-year">Now</div>
    <div class="timeline-card">
      <div class="timeline-school">Colorado State University</div>
      <div class="timeline-body">
        <h3>B.A. Political Science <em>(in progress)</em></h3>
        <p class="bullet">Currently taking courses while working full-time as an associate professor</p>
      </div>
    </div>
  </article>
</section>

## Recent Studies

<style>
  .recent-studies-block {
    --rs-panel: #1c2430;
    --rs-panel2: #222c39;
    --rs-text: #eef3f8;
    --rs-muted: #b5c0cc;
    --rs-muted2: #93a1b2;
    --rs-line: rgba(255,255,255,.08);
    --rs-csu: #5fbe7a;
    --rs-pols: #67d2c4;
    --rs-phil: #c39be5;
    --rs-shadow: 0 14px 28px rgba(0,0,0,.28);

    margin: 2rem 0;
    color: var(--rs-text);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .recent-studies-block * {
    box-sizing: border-box;
  }

  .recent-studies-card {
    background: linear-gradient(180deg, rgba(31,39,52,.92), rgba(22,29,38,.96));
    border: 1px solid var(--rs-line);
    border-radius: 22px;
    box-shadow: var(--rs-shadow);
    overflow: hidden;
  }

  .recent-studies-head {
    padding: 1.35rem 1.45rem 1.05rem;
    border-bottom: 1px solid var(--rs-line);
    background:
      radial-gradient(circle at top right, rgba(95,190,122,.12), transparent 16rem),
      linear-gradient(180deg, rgba(34,44,57,.88), rgba(28,36,48,.88));
  }

  .recent-studies-label {
    display: inline-block;
    padding: .35rem .6rem;
    border-radius: 999px;
    background: rgba(95,190,122,.12);
    color: #bfe8ca;
    border: 1px solid rgba(95,190,122,.22);
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .recent-studies-title {
    margin: .65rem 0 .55rem;
    color: #fff;
    font-family: ui-serif, Georgia, serif;
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    line-height: 1;
    letter-spacing: -.04em;
    font-weight: 700;
  }

  .recent-studies-intro {
    margin: 0;
    max-width: 780px;
    color: var(--rs-muted);
    font-size: .96rem;
    line-height: 1.48;
  }

  .recent-studies-summary {
    display: flex;
    gap: .55rem;
    flex-wrap: wrap;
    padding: 1rem 1.45rem 0;
  }

  .recent-studies-pill {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: .42rem .65rem;
    border-radius: 999px;
    background: rgba(255,255,255,.045);
    border: 1px solid var(--rs-line);
    color: var(--rs-muted);
    font-size: .78rem;
    font-weight: 700;
  }

  .recent-studies-pill::before {
    content: "";
    width: .55rem;
    height: .55rem;
    border-radius: 999px;
    background: var(--pill-color, var(--rs-csu));
  }

  .recent-studies-pill.pols { --pill-color: var(--rs-pols); }
  .recent-studies-pill.phil { --pill-color: var(--rs-phil); }

  .course-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .75rem;
    padding: 1rem 1.45rem 1.45rem;
  }

  .course-card {
    --accent: var(--rs-csu);
    display: grid;
    grid-template-columns: 5.5rem 1fr;
    gap: .85rem;
    align-items: stretch;
    background: linear-gradient(180deg, rgba(33,43,56,.98), rgba(27,35,46,.98));
    border: 1px solid var(--rs-line);
    border-radius: 16px;
    overflow: hidden;
    min-height: 5.65rem;
    box-shadow: 0 8px 14px rgba(0,0,0,.14);
  }

  .course-card.pols { --accent: var(--rs-pols); }
  .course-card.phil { --accent: var(--rs-phil); }

  .course-code {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: .22rem;
    padding: .7rem .75rem;
    background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 25%, #1f2937), color-mix(in oklab, var(--accent) 16%, #1b2430));
    border-right: 1px solid var(--rs-line);
  }

  .course-prefix {
    color: #fff;
    font-size: .83rem;
    font-weight: 800;
    letter-spacing: .04em;
  }

  .course-number {
    color: var(--accent);
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.03em;
  }

  .course-info {
    padding: .75rem .85rem .78rem 0;
  }

  .course-term {
    color: var(--accent);
    font-size: .76rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    margin-bottom: .32rem;
  }

  .course-title {
    margin: 0;
    color: #fff;
    font-size: .98rem;
    line-height: 1.22;
    font-weight: 600;
  }

  @media (max-width: 760px) {
    .recent-studies-head,
    .recent-studies-summary,
    .course-grid {
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .course-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 460px) {
    .course-card {
      grid-template-columns: 4.8rem 1fr;
      gap: .75rem;
    }

    .course-number {
      font-size: 1.15rem;
    }
  }
</style>

<section class="recent-studies-block" aria-labelledby="recent-studies-title">
  <div class="recent-studies-card">
    <div class="recent-studies-head">
      <span class="recent-studies-label">Recent Studies</span>
      <h2 class="recent-studies-title" id="recent-studies-title">Recent Studies</h2>
      <p class="recent-studies-intro">
        Since joining the CSU faculty in August 2018, I have used the university’s employee study privilege to take roughly one course per semester. My coursework has spanned philosophy, political science, and related fields, enriching my understanding and teaching across several disciplines.
      </p>
    </div>

    <div class="recent-studies-summary" aria-label="Recent studies summary">
      <span class="recent-studies-pill pols">7 Political Science</span>
      <span class="recent-studies-pill phil">6 Philosophy</span>
      <span class="recent-studies-pill">CSU employee study privilege</span>
    </div>

    <div class="course-grid">
      <article class="course-card pols">
        <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">345</span></div>
        <div class="course-info"><div class="course-term">Fall 2025</div><h3 class="course-title">Russian, Central, and Eastern European Politics</h3></div>
      </article>

      <article class="course-card pols">
        <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">101</span></div>
        <div class="course-info"><div class="course-term">Summer 2025</div><h3 class="course-title">American Government and Politics</h3></div>
      </article>

      <article class="course-card pols">
        <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">103</span></div>
        <div class="course-info"><div class="course-term">Spring 2025</div><h3 class="course-title">State and Local Government and Politics</h3></div>
      </article>

      <article class="course-card pols">
        <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">436</span></div>
        <div class="course-info"><div class="course-term">Fall 2024</div><h3 class="course-title">Comparative Foreign Policy</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">300</span></div>
        <div class="course-info"><div class="course-term">Spring 2024</div><h3 class="course-title">Ancient Greek Philosophy</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">353</span></div>
        <div class="course-info"><div class="course-term">Spring 2024</div><h3 class="course-title">Feminist Philosophies</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">462</span></div>
        <div class="course-info"><div class="course-term">Fall 2023</div><h3 class="course-title">Democracy and Free Speech (Capstone)</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">301</span></div>
        <div class="course-info"><div class="course-term">Spring 2023</div><h3 class="course-title">17th and 18th Century European Philosophy</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">354</span></div>
        <div class="course-info"><div class="course-term">Fall 2022</div><h3 class="course-title">Philosophy and Science Fiction</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">322</span></div>
        <div class="course-info"><div class="course-term">Summer 2022</div><h3 class="course-title">Biomedical Ethics</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">205</span></div>
        <div class="course-info"><div class="course-term">Spring 2022</div><h3 class="course-title">Ethics</h3></div>
      </article>

      <article class="course-card phil">
        <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">438</span></div>
        <div class="course-info"><div class="course-term">Fall 2021</div><h3 class="course-title">Philosophy of Mind</h3></div>
      </article>

      <article class="course-card pols">
        <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">437</span></div>
        <div class="course-info"><div class="course-term">Summer 2021</div><h3 class="course-title">International Security</h3></div>
      </article>
    </div>
  </div>
</section>

<br>

{% include image.html url="/images/aaron-bsee.png" caption="Undergraduate commencement at CSU with Dr. Tony Maciejewski (2007)" width=300 align="left" %} 

{% include image.html url="/images/cu-parents.jpg" caption="Masters graduation at CU-Boulder with my parents (2008)" width=300 align="left" %}

{% include image.html url="/images/aaron-burt.jpg" caption="With my Ph.D. advisor, Dr. Burt Simon, at CU-Denver (2018)" width=300  align="left" %}

{% include image.html url="/images/aaron-baphil.jpg" caption="Undergraduate commencement at CSU with Dr. Matt MacKenzie (2024)" width=300  align="left" %}