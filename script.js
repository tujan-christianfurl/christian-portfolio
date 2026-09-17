document.documentElement.classList.add('js');

window.addEventListener('DOMContentLoaded', function () {
  // Light / dark mode. The selected theme is saved so it stays the same
  // when the user changes pages or reloads the portfolio.
  const themeToggle = document.querySelector('.theme-toggle');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncThemeToggle() {
    if (!themeToggle) return;
    const dark = currentTheme() === 'dark';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  if (themeToggle) {
    syncThemeToggle();
    themeToggle.addEventListener('click', function () {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';

      if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      try {
        localStorage.setItem('portfolio-theme', next);
      } catch (error) {}

      syncThemeToggle();
    });
  }

  const textTargets = document.querySelectorAll(
    '.page-title .section-kicker, .page-title h1, .page-title p, ' +
    '.section-head .section-kicker, .section-head h2, .section-head p, ' +
    '.network-head .section-kicker, .network-head h2, .network-head p, ' +
    '.mini-intro .section-kicker, .mini-intro p'
  );

  const blockTargets = document.querySelectorAll(
    '.network-frame, .tech-item, .card, .skill-row, .contact-card, .contact-form, .banner-box'
  );

  const projects = document.querySelectorAll('.project');

  textTargets.forEach(function (element, index) {
    element.classList.add('reveal-text');
    element.style.setProperty('--delay', (index % 3) * 70 + 'ms');
  });

  blockTargets.forEach(function (element, index) {
    element.classList.add('reveal-block');
    element.style.setProperty('--delay', (index % 4) * 80 + 'ms');
  });

  projects.forEach(function (project, index) {
    project.classList.add('reveal-project');
    project.style.setProperty('--delay', (index % 2) * 110 + 'ms');
  });

  const targets = document.querySelectorAll('.reveal-text, .reveal-block, .reveal-project');

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (element) {
      element.classList.add('is-visible');
    });
  } else {
    const observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px'
    });

    targets.forEach(function (element) {
      observer.observe(element);
    });
  }

  /* ---------------------------------------------------------
     Dynamic polygon mesh
     ---------------------------------------------------------
     Every dot is treated as a movable vertex. While you scroll,
     the vertices drift in different directions. Every connected
     line is then redrawn to follow those moving vertices and each
     word follows its matching point.
  --------------------------------------------------------- */

  const svg = document.querySelector('.network-svg');
  if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const circles = Array.from(svg.querySelectorAll('.network-nodes circle'));
  const lines = Array.from(svg.querySelectorAll('.network-lines line'));
  const labels = Array.from(svg.querySelectorAll('.network-labels text'));

  if (!circles.length) {
    return;
  }

  const nodes = circles.map(function (circle, index) {
    return {
      baseX: Number(circle.getAttribute('cx')),
      baseY: Number(circle.getAttribute('cy')),
      x: Number(circle.getAttribute('cx')),
      y: Number(circle.getAttribute('cy')),
      phase: index * 0.93,
      ampX: 18 + (index % 4) * 7,
      ampY: 14 + ((index + 2) % 4) * 6
    };
  });

  // The labels in the SVG are already written in the same order as the nodes.
  // Save their original distance from the point so they keep that relationship.
  const labelOffsets = labels.map(function (label, index) {
    const node = nodes[index];
    return {
      x: Number(label.getAttribute('x')) - node.baseX,
      y: Number(label.getAttribute('y')) - node.baseY
    };
  });

  function findNodeIndex(x, y) {
    let closest = 0;
    let closestDistance = Infinity;

    nodes.forEach(function (node, index) {
      const dx = node.baseX - x;
      const dy = node.baseY - y;
      const distance = dx * dx + dy * dy;

      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    return closest;
  }

  const edges = lines.map(function (line) {
    return {
      element: line,
      start: findNodeIndex(Number(line.getAttribute('x1')), Number(line.getAttribute('y1'))),
      end: findNodeIndex(Number(line.getAttribute('x2')), Number(line.getAttribute('y2')))
    };
  });

  let targetScroll = window.scrollY;
  let smoothScroll = targetScroll;
  let lastScrollTime = performance.now();

  function updateMesh(now) {
    // Inertia makes the mesh lag slightly behind the user's scroll.
    smoothScroll += (targetScroll - smoothScroll) * 0.12;

    const rect = svg.getBoundingClientRect();
    const viewportCenter = window.innerHeight * 0.5;
    const svgCenter = rect.top + rect.height * 0.5;
    const proximity = Math.max(0, 1 - Math.abs(svgCenter - viewportCenter) / (window.innerHeight * 1.15));

    // Scroll position drives the larger deformation.
    const scrollWave = smoothScroll * 0.011;

    // When scrolling stops, a very slow time-based wave keeps the mesh alive.
    // The amplitude is intentionally tiny so the labels never feel detached.
    const idleSeconds = now * 0.001;
    const timeSinceScroll = now - lastScrollTime;
    const idleBlend = Math.min(1, Math.max(0, (timeSinceScroll - 120) / 650));

    nodes.forEach(function (node, index) {
      const strength = 0.45 + proximity * 0.75;

      const scrollX =
        Math.sin(scrollWave + node.phase) * node.ampX * strength +
        Math.sin(scrollWave * 0.48 + index * 1.7) * 7 * strength;

      const scrollY =
        Math.cos(scrollWave * 0.82 + node.phase * 1.35) * node.ampY * strength +
        Math.sin(scrollWave * 0.37 + index) * 6 * strength;

      const idleX =
        Math.sin(idleSeconds * 0.72 + node.phase * 1.15) * 2.7 * idleBlend +
        Math.sin(idleSeconds * 0.31 + index * 0.83) * 1.2 * idleBlend;

      const idleY =
        Math.cos(idleSeconds * 0.61 + node.phase * 1.4) * 2.2 * idleBlend +
        Math.sin(idleSeconds * 0.27 + index * 1.05) * 1.0 * idleBlend;

      node.x = node.baseX + scrollX + idleX;
      node.y = node.baseY + scrollY + idleY;

      circles[index].setAttribute('cx', node.x.toFixed(2));
      circles[index].setAttribute('cy', node.y.toFixed(2));

      if (labels[index]) {
        // Words follow their point, with a little independent movement while
        // scrolling and an even smaller idle drift when the page is still.
        const wordScrollX = Math.sin(scrollWave * 1.14 + index * 0.8) * 6 * strength;
        const wordScrollY = Math.cos(scrollWave * 0.96 + index * 1.1) * 5 * strength;
        const wordIdleX = Math.sin(idleSeconds * 0.82 + index * 1.31) * 1.5 * idleBlend;
        const wordIdleY = Math.cos(idleSeconds * 0.69 + index * 0.97) * 1.2 * idleBlend;

        labels[index].setAttribute(
          'x',
          (node.x + labelOffsets[index].x + wordScrollX + wordIdleX).toFixed(2)
        );
        labels[index].setAttribute(
          'y',
          (node.y + labelOffsets[index].y + wordScrollY + wordIdleY).toFixed(2)
        );
      }
    });

    // The lines are not animated separately. Their endpoints are continuously
    // attached to the current node positions, so the web stretches naturally.
    edges.forEach(function (edge) {
      const startNode = nodes[edge.start];
      const endNode = nodes[edge.end];

      edge.element.setAttribute('x1', startNode.x.toFixed(2));
      edge.element.setAttribute('y1', startNode.y.toFixed(2));
      edge.element.setAttribute('x2', endNode.x.toFixed(2));
      edge.element.setAttribute('y2', endNode.y.toFixed(2));
    });

    requestAnimationFrame(updateMesh);
  }

  function noteScroll() {
    targetScroll = window.scrollY;
    lastScrollTime = performance.now();
  }

  // Keep one animation loop running: scroll controls the larger motion and
  // elapsed time supplies the tiny idle floating motion.
  requestAnimationFrame(updateMesh);
  window.addEventListener('scroll', noteScroll, { passive: true });
  window.addEventListener('resize', noteScroll);
});
