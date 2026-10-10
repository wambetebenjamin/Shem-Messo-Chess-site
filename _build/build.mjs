/* Build the eight pages: head + nav + (page title band) + body + footer + scripts.
   Run from anywhere:   node _build/build.mjs
   It writes the finished pages into the site root (the parent of this folder)
   and reads the per-page body blocks from _build/pages/. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { head, banner, footer, scripts } from './shell.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..');
const SRC = resolve(HERE, 'pages');

const PAGES = [
  {
    file: 'index.html',
    title: 'Kericho Chess Club &amp; Academy · Chess coaching, tournaments and live boards in Kericho',
    desc: 'Kericho Chess Club & Academy: school chess coaching, inter-school tournaments, live broadcast boards, a playable board and club kits for schools across Kericho County, Kenya.',
    active: 'home',
    page: 'hero-slider',
    // the homepage opens with the hero slider, so it takes no title band
  },
  {
    file: 'about.html',
    title: 'About Us · Kericho Chess Club &amp; Academy, Kericho Kenya',
    desc: 'The story of Kericho Chess Club & Academy: our vision, values, objectives, milestones, office bearers and the partner schools we coach across Kericho County.',
    active: 'about',
    banner: { title: 'About Us', sub: 'The club, the academy and the people behind the boards' },
  },
  {
    file: 'coaching.html',
    title: 'Coaching Programmes · Kericho Chess Club &amp; Academy',
    desc: 'School coaching, private lessons, tournament prep and the Saturday club. A structured four-phase method that builds real players. Kericho, Kenya.',
    active: 'coaching',
    banner: { title: 'Coaching', sub: 'Three tracks and a club night, one method fitted to the school week' },
  },
  {
    file: 'tournaments.html',
    title: 'Upcoming Events · Tournaments · Kericho Chess Club &amp; Academy',
    desc: 'Inter-school chess tournaments across Kericho: fixtures, eight age categories, M-Pesa entry, online registration and the circuit honour roll.',
    active: 'tournaments',
    banner: { title: 'Upcoming Events', sub: 'Check em out!' },
  },
  {
    file: 'live.html',
    title: 'Live Broadcast Room · Kericho Chess Club &amp; Academy',
    desc: 'Watch academy chess live: Board 1 with live clocks, an evaluation bar, the move list and a spectator feed: a grandmaster broadcast for school chess in Kericho.',
    active: 'live',
    board3d: true, chessCore: true, page: 'live',
    banner: { title: 'Live Broadcast', sub: 'Boards 1 to 4, streamed with clocks on fixture days' },
  },
  {
    file: 'play.html',
    title: 'Play The Board · Kericho Chess Club &amp; Academy',
    desc: 'Play a real chess game right on the site: full rules, legal-move hints, check and mate detection, plus the daily Lichess puzzle and the academy team.',
    active: 'play',
    board3d: true, chessCore: true, engine: true, page: 'play',
    banner: { title: 'Play a Board', sub: 'Pass-and-play on one device, full rules included' },
  },
  {
    file: 'shop.html',
    title: 'Materials &amp; Kits · Kericho Chess Club &amp; Academy Shop',
    desc: 'Tournament chess sets, digital clocks and training workbooks for schools building a chess club, ordered with one WhatsApp message. Kericho, Kenya.',
    active: 'shop',
    banner: { title: 'Club Shop', sub: 'Boards, clocks and workbooks, ordered with one WhatsApp message' },
  },
  {
    file: 'contact.html',
    title: 'Enrol &amp; Contact · Kericho Chess Club &amp; Academy',
    desc: 'Enrol a learner, become an academy member or bring coaching to your school. Contact Kericho Chess Club &amp; Academy by WhatsApp, phone or the forms here.',
    active: 'contact',
    banner: { title: 'Contact Us', sub: 'Message the office, or an office bearer directly' },
  },
];

let count = 0;
for (const p of PAGES) {
  const body = readFileSync(`${SRC}/${p.file}`, 'utf8').trimEnd();
  const html =
    head({ title: p.title, desc: p.desc, active: p.active }) +
    '  <main id="main">\n' +
    (p.banner ? banner(p.banner) + '\n' : '') +
    body + '\n' +
    '  </main>\n' +
    footer() +
    scripts({ board3d: !!p.board3d, page: p.page || false, chessCore: !!p.chessCore, engine: !!p.engine });
  writeFileSync(`${OUT}/${p.file}`, html);
  count++;
  console.log('wrote', p.file, html.length, 'bytes');
}
console.log(count, 'pages built');
