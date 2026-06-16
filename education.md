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
  .recent-studies-simple {
    --rs-card: #212b38;
    --rs-card2: #1b232e;
    --rs-text: #eef3f8;
    --rs-muted: #b5c0cc;
    --rs-muted2: #93a1b2;
    --rs-line: rgba(255, 255, 255, .08);
    --rs-csu: #5fbe7a;

    max-width: 980px;
    margin: 2rem auto;
    color: var(--rs-text);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .recent-studies-simple * {
    box-sizing: border-box;
  }

  .recent-studies-simple .rs-panel {
    background: linear-gradient(180deg, rgba(31, 39, 52, .92), rgba(22, 29, 38, .96));
    border: 1px solid var(--rs-line);
    border-radius: 22px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, .28);
    overflow: hidden;
  }

  .recent-studies-simple .rs-header {
    padding: 1rem 1.15rem .95rem;
    border-bottom: 1px solid var(--rs-line);
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--rs-csu) 18%, #1f2937),
      color-mix(in oklab, var(--rs-csu) 10%, #1b2430)
    );
  }

  .recent-studies-simple .rs-header h2 {
    margin: 0 0 .45rem;
    color: #fff;
    font-size: 1.35rem;
    line-height: 1.15;
    font-weight: 600;
  }

  .recent-studies-simple .rs-header p {
    margin: 0;
    max-width: 850px;
    color: var(--rs-muted);
    font-size: .88rem;
    line-height: 1.45;
  }

  .recent-studies-simple .rs-list {
    display: grid;
    gap: 0;
    padding: .35rem 0;
  }

  .recent-studies-simple .rs-course {
    display: grid;
    grid-template-columns: 5.1rem 1fr 6.7rem;
    gap: .85rem;
    align-items: baseline;
    padding: .55rem 1.15rem;
    border-top: 1px solid rgba(255, 255, 255, .055);
  }

  .recent-studies-simple .rs-course:first-child {
    border-top: 0;
  }

  .recent-studies-simple .rs-code {
    color: #fff;
    font-size: .86rem;
    font-weight: 650;
    letter-spacing: .02em;
    white-space: nowrap;
  }

  .recent-studies-simple .rs-code::before {
    content: "";
    display: inline-block;
    width: .43rem;
    height: .43rem;
    margin-right: .45rem;
    border-radius: 999px;
    background: var(--rs-csu);
    transform: translateY(-1px);
  }

  .recent-studies-simple .rs-title {
    color: var(--rs-muted);
    font-size: .9rem;
    line-height: 1.28;
  }

  .recent-studies-simple .rs-term {
    color: var(--rs-muted2);
    font-size: .78rem;
    text-align: right;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    .recent-studies-simple .rs-course {
      grid-template-columns: 5rem 1fr;
      gap: .3rem .75rem;
      padding: .65rem 1rem;
    }

    .recent-studies-simple .rs-term {
      grid-column: 2;
      text-align: left;
    }

    .recent-studies-simple .rs-header {
      padding: .95rem 1rem .9rem;
    }
  }
</style>

<section class="recent-studies-simple" aria-labelledby="recent-studies-title">
  <div class="rs-panel">
    <div class="rs-header">
      <h2 id="recent-studies-title">Recent Studies</h2>
      <p>
        I have been taking about one class per semester at CSU since joining the faculty in August 2018, using the university’s employee study privilege. My coursework has covered philosophy, political science, and related fields.
      </p>
    </div>

    <div class="rs-list" aria-label="Recent studies courses">
      <div class="rs-course">
        <div class="rs-code">POLS 345</div>
        <div class="rs-title">Russian, Central, and Eastern European Politics</div>
        <div class="rs-term">Fall 2025</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">POLS 101</div>
        <div class="rs-title">American Government and Politics</div>
        <div class="rs-term">Summer 2025</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">POLS 103</div>
        <div class="rs-title">State and Local Government and Politics</div>
        <div class="rs-term">Spring 2025</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">POLS 436</div>
        <div class="rs-title">Comparative Foreign Policy</div>
        <div class="rs-term">Fall 2024</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 300</div>
        <div class="rs-title">Ancient Greek Philosophy</div>
        <div class="rs-term">Spring 2024</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 353</div>
        <div class="rs-title">Feminist Philosophies</div>
        <div class="rs-term">Spring 2024</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 462</div>
        <div class="rs-title">Democracy and Free Speech (Capstone)</div>
        <div class="rs-term">Fall 2023</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 301</div>
        <div class="rs-title">17th and 18th Century European Philosophy</div>
        <div class="rs-term">Spring 2023</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 354</div>
        <div class="rs-title">Philosophy and Science Fiction</div>
        <div class="rs-term">Fall 2022</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 322</div>
        <div class="rs-title">Biomedical Ethics</div>
        <div class="rs-term">Summer 2022</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 205</div>
        <div class="rs-title">Ethics</div>
        <div class="rs-term">Spring 2022</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">PHIL 438</div>
        <div class="rs-title">Philosophy of Mind</div>
        <div class="rs-term">Fall 2021</div>
      </div>

      <div class="rs-course">
        <div class="rs-code">POLS 437</div>
        <div class="rs-title">International Security</div>
        <div class="rs-term">Summer 2021</div>
      </div>
    </div>
  </div>
</section>

<br>

{% include image.html url="/images/aaron-bsee.png" caption="Undergraduate commencement at CSU with Dr. Tony Maciejewski (2007)" width=300 align="left" %} 

{% include image.html url="/images/cu-parents.jpg" caption="Masters graduation at CU-Boulder with my parents (2008)" width=300 align="left" %}

{% include image.html url="/images/aaron-burt.jpg" caption="With my Ph.D. advisor, Dr. Burt Simon, at CU-Denver (2018)" width=300  align="left" %}

{% include image.html url="/images/aaron-baphil.jpg" caption="Undergraduate commencement at CSU with Dr. Matt MacKenzie (2024)" width=300  align="left" %}
