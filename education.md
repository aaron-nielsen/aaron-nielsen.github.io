---
layout: page
title: Education 
permalink: /education/
---

<style>
  .education-block {
    --edu-card: #212b38;
    --edu-card2: #1b232e;
    --edu-text: #eef3f8;
    --edu-muted: #b5c0cc;
    --edu-muted2: #93a1b2;
    --edu-line: rgba(255, 255, 255, .08);
    --edu-csu: #5fbe7a;
    --edu-hs: #8d98a7;
    --edu-cub: #d8b25f;
    --edu-cud: #8eb6ff;

    max-width: 980px;
    margin: 2rem auto;
    color: var(--edu-text);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .education-block * {
    box-sizing: border-box;
  }

  .education-block .edu-panel {
    background: linear-gradient(180deg, rgba(31, 39, 52, .92), rgba(22, 29, 38, .96));
    border: 1px solid var(--edu-line);
    border-radius: 22px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, .28);
    overflow: hidden;
  }

  .education-block .edu-header {
    padding: 1rem 1.15rem .95rem;
    border-bottom: 1px solid var(--edu-line);
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--edu-csu) 18%, #1f2937),
      color-mix(in oklab, var(--edu-csu) 10%, #1b2430)
    );
  }

  .education-block .edu-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.32rem;
    line-height: 1.15;
    font-weight: 500;
  }

  .education-block .edu-header p {
    margin: .45rem 0 0;
    max-width: 850px;
    color: var(--edu-muted);
    font-size: .88rem;
    line-height: 1.45;
  }

  .degree-list,
  .rs-list {
    display: grid;
    gap: 0;
    padding: .35rem 0;
  }

  .degree-row,
  .rs-course {
    display: grid;
    gap: .85rem;
    align-items: baseline;
    padding: .55rem 1.15rem;
    border-top: 1px solid rgba(255, 255, 255, .055);
  }

  .degree-row:first-child,
  .rs-course:first-child {
    border-top: 0;
  }

  .degree-row {
    grid-template-columns: 4.6rem 1fr 14rem;
  }

  .degree-year,
  .rs-code {
    color: #fff;
    font-size: .86rem;
    font-weight: 600;
    letter-spacing: .02em;
    white-space: nowrap;
  }

  .degree-year::before,
  .rs-code::before {
    content: "";
    display: inline-block;
    width: .43rem;
    height: .43rem;
    margin-right: .45rem;
    border-radius: 999px;
    background: var(--accent, var(--edu-csu));
    transform: translateY(-1px);
  }

  .degree-title,
  .rs-title {
    color: var(--edu-muted);
    font-size: .9rem;
    line-height: 1.28;
  }

  .degree-school,
  .rs-term {
    color: var(--edu-muted2);
    font-size: .78rem;
    text-align: right;
    white-space: nowrap;
  }

  .degree-row.csu,
  .timeline-row.csu,
  .timeline-row.current {
    --accent: var(--edu-csu);
  }

  .degree-row.cub,
  .timeline-row.cub {
    --accent: var(--edu-cub);
  }

  .degree-row.cud,
  .timeline-row.cud {
    --accent: var(--edu-cud);
  }

  .timeline-row.hs {
    --accent: var(--edu-hs);
  }

  .timeline-list {
    position: relative;
    padding: .45rem 0 .45rem;
  }

  .timeline-list::before {
    content: "";
    position: absolute;
    left: 26px;
    top: .75rem;
    bottom: .75rem;
    width: 3px;
    background: linear-gradient(
      180deg,
      rgba(141, 152, 167, .55),
      rgba(95, 190, 122, .55),
      rgba(142, 182, 255, .55)
    );
    border-radius: 999px;
  }

  .timeline-row {
    position: relative;
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 14px;
    align-items: start;
    padding: .5rem 1.15rem .5rem .55rem;
  }

  .timeline-year {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(13, 17, 23, .92);
    border: 2px solid var(--accent);
    display: grid;
    place-items: center;
    justify-self: center;
    color: var(--accent);
    font-weight: 600;
    font-size: .76rem;
    box-shadow: 0 6px 12px rgba(0, 0, 0, .18);
    z-index: 2;
  }

  .timeline-card {
    background: linear-gradient(180deg, rgba(33, 43, 56, .94), rgba(27, 35, 46, .94));
    border: 1px solid var(--edu-line);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 14px rgba(0, 0, 0, .14);
  }

  .timeline-school {
    padding: .55rem .75rem;
    background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--accent) 25%, #1f2937),
      color-mix(in oklab, var(--accent) 16%, #1b2430)
    );
    border-bottom: 1px solid var(--edu-line);
    color: #fff;
    font-size: .9rem;
    font-weight: 600;
    line-height: 1.15;
  }

  .timeline-body {
    padding: .65rem .75rem .72rem;
  }

  .timeline-body h3 {
    margin: 0 0 .32rem;
    color: #fff;
    font-size: 1.02rem;
    line-height: 1.14;
    font-weight: 400;
  }

  .timeline-body p {
    margin: 0;
    color: var(--edu-muted);
    font-size: .82rem;
    line-height: 1.42;
  }

  .timeline-body p + p {
    margin-top: .32rem;
  }

  .timeline-body p.bullet {
    position: relative;
    padding-left: .75rem;
  }

  .timeline-body p.bullet::before {
    content: "•";
    position: absolute;
    left: 0;
    top: 0;
    color: var(--accent);
    font-weight: 650;
  }

  .timeline-row.current .timeline-card {
    border-style: dashed;
  }

  .rs-course {
    grid-template-columns: 5.1rem 1fr 6.7rem;
  }

  .rs-code {
    font-weight: 650;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .85rem;
    padding: 1rem 1.15rem 1.15rem;
  }

  .photo-grid figure {
    margin: 0;
    background: linear-gradient(180deg, rgba(33, 43, 56, .94), rgba(27, 35, 46, .94));
    border: 1px solid var(--edu-line);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 14px rgba(0, 0, 0, .14);
  }

  .photo-grid img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  .photo-grid figcaption {
    color: var(--edu-muted);
    font-size: .82rem;
    line-height: 1.35;
    padding: .65rem .75rem .7rem;
  }

  @media (max-width: 700px) {
    .degree-row,
    .rs-course {
      grid-template-columns: 5rem 1fr;
      gap: .3rem .75rem;
      padding: .65rem 1rem;
    }

    .degree-school,
    .rs-term {
      grid-column: 2;
      text-align: left;
    }

    .education-block .edu-header {
      padding: .95rem 1rem .9rem;
    }

    .timeline-list::before {
      left: 19px;
    }

    .timeline-row {
      grid-template-columns: 38px 1fr;
      gap: 10px;
      padding: .5rem 1rem .5rem .45rem;
    }

    .timeline-year {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: .65rem;
    }

    .timeline-school {
      font-size: .84rem;
    }

    .timeline-body h3 {
      font-size: .96rem;
    }
  }

  @media (max-width: 560px) {
    .photo-grid {
      grid-template-columns: 1fr;
      padding: .9rem 1rem 1rem;
    }
  }
</style>

<section class="education-block" aria-labelledby="degrees-title">
  <div class="edu-panel">
    <div class="edu-header">
      <h2 id="degrees-title">Degrees</h2>
    </div>

    <div class="degree-list" aria-label="Degrees">
      <div class="degree-row cud">
        <div class="degree-year">2018</div>
        <div class="degree-title">Ph.D. Applied Mathematics</div>
        <div class="degree-school">University of Colorado Denver</div>
      </div>

      <div class="degree-row csu">
        <div class="degree-year">2014</div>
        <div class="degree-title">M.S. Statistics</div>
        <div class="degree-school">Colorado State University</div>
      </div>

      <div class="degree-row cud">
        <div class="degree-year">2012</div>
        <div class="degree-title">M.S. Applied Mathematics</div>
        <div class="degree-school">University of Colorado Denver</div>
      </div>

      <div class="degree-row cub">
        <div class="degree-year">2008</div>
        <div class="degree-title">M.S. Electrical Engineering</div>
        <div class="degree-school">University of Colorado Boulder</div>
      </div>

      <div class="degree-row csu">
        <div class="degree-year">2007</div>
        <div class="degree-title">B.S. Electrical Engineering and Mathematics</div>
        <div class="degree-school">Colorado State University</div>
      </div>

      <div class="degree-row csu">
        <div class="degree-year">2024</div>
        <div class="degree-title">B.A. Philosophy</div>
        <div class="degree-school">Colorado State University</div>
      </div>
    </div>
  </div>
</section>

<section class="education-block" aria-labelledby="timeline-title">
  <div class="edu-panel">
    <div class="edu-header">
      <h2 id="timeline-title">Education Timeline</h2>
    </div>

    <div class="timeline-list">
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
    </div>
  </div>
</section>

<section class="education-block" aria-labelledby="recent-studies-title">
  <div class="edu-panel">
    <div class="edu-header">
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

<section class="education-block" aria-labelledby="education-photos-title">
  <div class="edu-panel">
    <div class="edu-header">
      <h2 id="education-photos-title">Photos</h2>
    </div>

    <div class="photo-grid">
      <figure>
        <img src="/images/aaron-bsee.png" alt="Undergraduate commencement at CSU with Dr. Tony Maciejewski">
        <figcaption>Undergraduate commencement at CSU with Dr. Tony Maciejewski (2007)</figcaption>
      </figure>

      <figure>
        <img src="/images/cu-parents.jpg" alt="Masters graduation at CU Boulder with my parents">
        <figcaption>Masters graduation at CU Boulder with my parents (2008)</figcaption>
      </figure>

      <figure>
        <img src="/images/aaron-burt.jpg" alt="With my Ph.D. advisor, Dr. Burt Simon, at CU Denver">
        <figcaption>With my Ph.D. advisor, Dr. Burt Simon, at CU Denver (2018)</figcaption>
      </figure>

      <figure>
        <img src="/images/aaron-baphil.jpg" alt="Undergraduate commencement at CSU with Dr. Matt MacKenzie">
        <figcaption>Undergraduate commencement at CSU with Dr. Matt MacKenzie (2024)</figcaption>
      </figure>
    </div>
  </div>
</section>
