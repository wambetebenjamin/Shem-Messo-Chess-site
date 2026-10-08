/* Build the eight pages: head + body + CTA band + slim footer + scripts.
   Run from anywhere:   node _build/build.mjs
   It writes the finished pages into the site root (the parent of this folder)
   and reads the per-page body blocks from _build/pages/. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { head, footer, scripts, ctaBand } from './shell.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..');
const SRC = resolve(HERE, 'pages');

const WA = 'https://wa.me/254729037585';

const PAGES = [
  {
    file: 'index.html',
    title: 'Kericho Chess Club &amp; Academy · Chess coaching, tournaments and live boards in Kericho',
    desc: 'Kericho Chess Club & Academy: school chess coaching, inter-school tournaments, live broadcast boards, a playable board and club kits for schools across Kericho County, Kenya.',
    active: 'home',
    cta: {
      title: 'Start with the first lesson',
      text: 'Tell us the learner\'s age, school and goal. Shem maps the right track from there — usually the same day.',
      label: 'Enrol a Learner', icon: 'fa-user-plus',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20I%27d%20like%20to%20enrol%20a%20learner%20at%20Kericho%20Chess%20Academy.`, label: 'WhatsApp the academy', ext: true },
    },
  },
  {
    file: 'about.html',
    title: 'About Us · Kericho Chess Club &amp; Academy, Kericho Kenya',
    desc: 'The story of Kericho Chess Club & Academy: our vision, values, objectives, milestones, office bearers and the partner schools we coach across Kericho County.',
    active: 'about',
    cta: {
      title: 'Be the next chapter',
      text: 'School, parent or learner: there is a seat at the board for you.',
      label: 'Enrol a Learner', icon: 'fa-user-plus',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20I%27d%20like%20to%20know%20more%20about%20the%20academy.`, label: 'WhatsApp the academy', ext: true },
    },
  },
  {
    file: 'coaching.html',
    title: 'Coaching Programmes · Kericho Chess Club &amp; Academy',
    desc: 'School coaching, private lessons, tournament prep and the Saturday club. A structured four-phase method that builds real players — Kericho, Kenya.',
    active: 'coaching',
    cta: {
      title: 'Start with the first lesson',
      text: 'Tell us the learner\'s age, school and goal. Shem maps the right track from there — usually the same day.',
      label: 'Enrol a Learner', icon: 'fa-user-plus',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20please%20share%20current%20coaching%20fees.`, label: 'Ask about fees', ext: true },
    },
  },
  {
    file: 'tournaments.html',
    title: 'The Circuit · Tournaments · Kericho Chess Club &amp; Academy',
    desc: 'Inter-school chess tournaments across Kericho: fixtures, eight age categories, M-Pesa entry, online registration and the circuit honour roll.',
    active: 'tournaments',
    cta: {
      title: 'Claim a board in the next fixture',
      text: 'Registration closes when the draw is made. Put the learner\'s name in early, then pay by M-Pesa Paybill 880100.',
      label: 'Register Now', icon: 'fa-clipboard-list', href: '#register',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20I%27d%20like%20to%20enter%20the%20next%20tournament.`, label: 'Enter on WhatsApp', ext: true },
    },
  },
  {
    file: 'live.html',
    title: 'Live Broadcast Room · Kericho Chess Club &amp; Academy',
    desc: 'Watch academy chess live: Board 1 with live clocks, an evaluation bar, the move list and a spectator feed — a grandmaster-style broadcast for school chess in Kericho.',
    active: 'live',
    board3d: true, chessCore: true, page: 'live',
    cta: {
      title: 'Play your own game live',
      text: 'Step off the spectator bench. The same engine runs the practice board, and the circuit is open for entries.',
      label: 'See it in action', icon: 'fa-play', href: 'play.html',
      wa: null,
    },
  },
  {
    file: 'play.html',
    title: 'Play The Board · Kericho Chess Club &amp; Academy',
    desc: 'Play a real chess game right on the site: full rules, legal-move hints, check and mate detection — plus the daily Lichess puzzle and the academy team.',
    active: 'play',
    board3d: true, chessCore: true, page: 'play',
    cta: {
      title: 'Warmed up? Get coached',
      text: 'The board shows you the game. The academy shows you how to win it.',
      label: 'Enrol Now', icon: 'fa-user-plus', href: 'contact.html',
      wa: { href: 'https://www.kwaarena.com/?ref=b95ae9f671df7b255e15a188', label: 'Play &amp; Earn on Kwaarena', icon: 'fas fa-coins', ext: true },
    },
  },
  {
    file: 'shop.html',
    title: 'Materials &amp; Kits · Kericho Chess Club &amp; Academy Shop',
    desc: 'Tournament chess sets, digital clocks and training workbooks for schools building a chess club — ordered with one WhatsApp message. Kericho, Kenya.',
    active: 'shop',
    cta: {
      title: 'Your club starts with one set',
      text: 'One board in a classroom is how every academy story on this site began.',
      label: 'Talk to Shem', icon: 'fa-comments', href: 'contact.html#enquiry',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20help%20us%20choose%20materials%20for%20a%20new%20school%20club.`, label: 'WhatsApp about materials', ext: true },
    },
  },
  {
    file: 'contact.html',
    title: 'Enrol &amp; Contact · Kericho Chess Club &amp; Academy',
    desc: 'Enrol a learner, become an academy member or bring coaching to your school. Contact Kericho Chess Club &amp; Academy by WhatsApp, phone or the forms here.',
    active: 'contact',
    cta: {
      title: 'Say hello to the coach',
      text: 'Questions about enrolment, fees, boards or the next fixture: WhatsApp is the fastest route, and calls are always welcome.',
      label: 'Enrol a learner', icon: 'fa-user-plus', href: '#membership',
      wa: { href: `${WA}?text=Hi%20Shem%2C%20a%20question%20about%20the%20academy.`, label: 'WhatsApp Shem', ext: true },
    },
  },
];

let count = 0;
for (const p of PAGES) {
  const body = readFileSync(`${SRC}/${p.file}`, 'utf8').trimEnd();
  const html =
    head({ title: p.title, desc: p.desc, active: p.active }) +
    '\n  <main id="main">\n' +
    body + '\n' +
    ctaBand({
      title: p.cta.title,
      text: p.cta.text,
      href: p.cta.href || 'contact.html',
      label: p.cta.label,
      icon: p.cta.icon,
      wa: p.cta.wa && p.cta.wa.label ? p.cta.wa : null,
    }) +
    '  </main>\n' +
    footer() +
    scripts({ board3d: !!p.board3d, page: p.page || false, chessCore: !!p.chessCore });
  writeFileSync(`${OUT}/${p.file}`, html);
  count++;
  console.log('wrote', p.file, html.length, 'bytes');
}
console.log(count, 'pages built');
