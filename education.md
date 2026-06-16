---
layout: page
title: Education 
permalink: /education/
---

<style>
  .education-section,
  .education-timeline,
  .recent-studies-block {
    --edu-card: #212b38;
    --edu-card2: #1b232e;
    --edu-line: rgba(255, 255, 255, .08);
    --edu-text: #eef3f8;
    --edu-muted: #b5c0cc;
    --edu-muted2: #93a1b2;
    --hs: #8d98a7;
    --csu: #5fbe7a;
    --cub: #d8b25f;
    --cud: #8eb6ff;

    max-width: 980px;
    margin: 1.65rem auto;
    color: var(--edu-text);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .education-section *,
  .education-timeline *,
  .recent-studies-block * {
    box-sizing: border-box;
  }

  .edu-section-head {
    margin: 0 0 .8rem;
  }

  .edu-section-head h2 {
    margin: 0 0 .35rem;
    color: #fff;
    font-family: ui-serif, Georgia, serif;
    font-size: clamp(1.45rem, 3vw, 2.05rem);
    line-height: 1.05;
    letter-spacing: -.025em;
    font-weight: 500;
  }

  .edu-section-head p {
    margin: 0;
    color: var(--edu-muted);
    font-size: .92rem;
    line-height: 1.45;
    max-width: 820px;
  }

  .degree-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .7rem;
  }

  .degree-card {
    --accent: var(--csu);
    background: linear-gradient(180deg, rgba(33, 43, 56, .92), rgba(27, 35, 46, .92));
    border: 1px solid var(--edu-line);
    border-left: 4px solid var(--accent);
    border-radius: 14px;
    padding: .75rem .85rem;
    box-shadow: 0 6px 12px rgba(0, 0, 0, .12);
  }

  .degree-card.cub { --accent: var(--cub); }
  .degree-card.cud { --accent: var(--cud); }

  .degree-year {
    color: var(--accent);
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    margin-bottom: .32rem;
  }

  .degree-card h3 {
    margin: 0 0 .22rem;
    color: #fff;
    font-size: 1rem;
    line-height: 1.18;
    font-weight: 500;
  }

  .degree-card p {
    margin: 0;
    color: var(--edu-muted);
    font-size: .82rem;
    line-height: 1.35;
  }

  .education-timeline {
    position: relative;
    padding: 0 0 0;
  }

  .education-timeline::before {
    content: "";
    position: absolute;
    left: 40px;
    top: 5.05rem;
    bottom: .4rem;
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

  .education-timeline .timeline-card,
  .course-card {
    background: linear-gradient(180deg, rgba(33, 43, 56, .94), rgba(27, 35, 46, .94));
    border: 1px solid var(--edu-line);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 14px rgba(0, 0, 0, .14);
  }

  .education-timeline .timeline-school,
  .course-code {
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--accent) 25%, #1f2937),
      color-mix(in oklab, var(--accent) 16%, #1b2430)
    );
    border-bottom: 1px solid var(--edu-line);
    color: #fff;
  }

  .education-timeline .timeline-school {
    padding: 10px 13px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.15;
  }

  .education-timeline .timeline-body {
    padding: 11px 13px 12px;
  }

  .education-timeline .timeline-body h3 {
    margin: 0 0 5px;
    font-size: 19px;
    line-height: 1.12;
    color: #fff;
    font-weight: 500;
  }

  .education-timeline .timeline-body p,
  .course-meta,
  .course-title {
    margin: 0;
    color: var(--edu-muted);
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

  .course-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .7rem;
  }

  .course-card {
    --accent: var(--csu);
    display: grid;
    grid-template-columns: 5.35rem 1fr;
    min-height: 4.6rem;
  }

  .course-code {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: .18rem;
    padding: .65rem .72rem;
    border-bottom: 0;
    border-right: 1px solid var(--edu-line);
  }

  .course-prefix {
    font-size: .76rem;
    font-weight: 700;
    letter-spacing: .05em;
  }

  .course-number {
    color: var(--accent);
    font-size: 1.15rem;
    line-height: 1;
    font-weight: 700;
  }

  .course-info {
    padding: .68rem .78rem .72rem;
  }

  .course-meta {
    color: var(--csu);
    font-size: .74rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    margin-bottom: .3rem;
  }

  .course-title {
    color: #fff;
    font-size: .92rem;
    line-height: 1.22;
    font-weight: 500;
  }

  @media (max-width: 760px) {
    .degree-grid,
    .course-list {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .education-timeline::before {
      left: 28px;
      top: 5.35rem;
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

  @media (max-width: 460px) {
    .course-card {
      grid-template-columns: 4.65rem 1fr;
    }

    .course-number {
      font-size: 1.05rem;
    }
  }
</style>

<section class="education-section" aria-labelledby="degrees-title">
  <div class="edu-section-head">
    <h2 id="degrees-title">Degrees</h2>
    <p>A compact overview of completed degrees before the fuller academic timeline.</p>
  </div>

  <div class="degree-grid">
    <article class="degree-card csu">
      <div class="degree-year">2007</div>
      <h3>B.S. Electrical Engineering and Mathematics</h3>
      <p>Colorado State University</p>
    </article>

    <article class="degree-card cub">
      <div class="degree-year">2008</div>
      <h3>M.S. Electrical Engineering</h3>
      <p>University of Colorado Boulder</p>
    </article>

    <article class="degree-card cud">
      <div class="degree-year">2012</div>
      <h3>M.S. Applied Mathematics</h3>
      <p>University of Colorado Denver</p>
    </article>

    <article class="degree-card csu">
      <div class="degree-year">2014</div>
      <h3>M.S. Statistics</h3>
      <p>Colorado State University</p>
    </article>

    <article class="degree-card cud">
      <div class="degree-year">2018</div>
      <h3>Ph.D. Applied Mathematics</h3>
      <p>University of Colorado Denver</p>
    </article>

    <article class="degree-card csu">
      <div class="degree-year">2024</div>
      <h3>B.A. Philosophy</h3>
      <p>Colorado State University</p>
    </article>
  </div>
</section>

<section class="education-timeline" aria-labelledby="timeline-title">
  <div class="edu-section-head">
    <h2 id="timeline-title">Education Timeline</h2>
    <p>Selected completion dates, academic transitions, fellowships, teaching milestones, and current study.</p>
  </div>

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

<section class="recent-studies-block" aria-labelledby="recent-studies-title">
  <div class="edu-section-head">
    <h2 id="recent-studies-title">Recent Studies</h2>
    <p>Since joining the CSU faculty in August 2018, I have used the university’s employee study privilege to take roughly one course per semester. My coursework has covered philosophy, political science, and related fields.</p>
  </div>

  <div class="course-list">
    <article class="course-card">
      <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">345</span></div>
      <div class="course-info"><div class="course-meta">Fall 2025</div><h3 class="course-title">Russian, Central, and Eastern European Politics</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">101</span></div>
      <div class="course-info"><div class="course-meta">Summer 2025</div><h3 class="course-title">American Government and Politics</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">103</span></div>
      <div class="course-info"><div class="course-meta">Spring 2025</div><h3 class="course-title">State and Local Government and Politics</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">436</span></div>
      <div class="course-info"><div class="course-meta">Fall 2024</div><h3 class="course-title">Comparative Foreign Policy</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">300</span></div>
      <div class="course-info"><div class="course-meta">Spring 2024</div><h3 class="course-title">Ancient Greek Philosophy</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">353</span></div>
      <div class="course-info"><div class="course-meta">Spring 2024</div><h3 class="course-title">Feminist Philosophies</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">462</span></div>
      <div class="course-info"><div class="course-meta">Fall 2023</div><h3 class="course-title">Democracy and Free Speech (Capstone)</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">301</span></div>
      <div class="course-info"><div class="course-meta">Spring 2023</div><h3 class="course-title">17th and 18th Century European Philosophy</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">354</span></div>
      <div class="course-info"><div class="course-meta">Fall 2022</div><h3 class="course-title">Philosophy and Science Fiction</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">322</span></div>
      <div class="course-info"><div class="course-meta">Summer 2022</div><h3 class="course-title">Biomedical Ethics</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">205</span></div>
      <div class="course-info"><div class="course-meta">Spring 2022</div><h3 class="course-title">Ethics</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">PHIL</span><span class="course-number">438</span></div>
      <div class="course-info"><div class="course-meta">Fall 2021</div><h3 class="course-title">Philosophy of Mind</h3></div>
    </article>

    <article class="course-card">
      <div class="course-code"><span class="course-prefix">POLS</span><span class="course-number">437</span></div>
      <div class="course-info"><div class="course-meta">Summer 2021</div><h3 class="course-title">International Security</h3></div>
    </article>
  </div>
</section>

<br>

{% include image.html url="/images/aaron-bsee.png" caption="Undergraduate commencement at CSU with Dr. Tony Maciejewski (2007)" width=300 align="left" %} 

{% include image.html url="/images/cu-parents.jpg" caption="Masters graduation at CU-Boulder with my parents (2008)" width=300 align="left" %}

{% include image.html url="/images/aaron-burt.jpg" caption="With my Ph.D. advisor, Dr. Burt Simon, at CU-Denver (2018)" width=300  align="left" %}

{% include image.html url="/images/aaron-baphil.jpg" caption="Undergraduate commencement at CSU with Dr. Matt MacKenzie (2024)" width=300  align="left" %}
