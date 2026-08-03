const T = {"siteTitle":"내 프로그램","siteTagline":"필요한 것을 골라 바로 내려받으세요","statDownloads":"받아간 횟수","statPrograms":"프로그램","searchPlaceholder":"이름으로 찾기","all":"전체","kinds":{"program":"프로그램","mobile":"모바일","web":"웹","unknown":"기타"},"download":"받기","isNew":"NEW","versionLabel":"버전","updatedLabel":"올린 날","downloadsLabel":"받아감","sizeUnknown":"크기 모름","detailAbout":"어떤 프로그램인가요","detailChanged":"이번에 바뀐 점","detailNeeds":"필요한 환경","detailOlder":"이전 것도 받을 수 있어요","detailClose":"닫기","needs":{"program":"윈도우 10 이상","mobile":"안드로이드 8.0 이상","web":"인터넷이 되는 브라우저","unknown":"따로 필요한 것 없음"},"emptyTitle":"곧 프로그램이 올라옵니다","emptyBody":"준비되는 대로 여기에 나타납니다. 잠시만 기다려 주세요.","noMatch":"찾으시는 것이 없습니다","noMatchBody":"다른 말로 찾아보시거나 전체를 눌러 보세요.","warnTitle":"처음 실행할 때 파란 창이 뜨면","warnBody":"\"추가 정보\" 를 누르고 \"실행\" 을 누르시면 됩니다. 프로그램에 문제가 있는 것이 아닙니다.","footer":"Project Hub 로 만들었습니다","defaultChangelog":"성능 개선 및 오류 수정"};
const NEW_DAYS = 14;
let items = [];
let kind = 'all';
let term = '';
const picked = new URLSearchParams(location.search).get('p');

// 프로그램마다 다른 색 — 이름에서 뽑으므로 늘 같은 색이 나온다
function iconColor(name) {
  let sum = 0;
  for (const ch of String(name || '')) sum = (sum * 31 + ch.codePointAt(0)) % 360;
  return 'hsl(' + sum + ' 62% 48%)';
}

const ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9"/><path d="M4 8l4 4 4-4"/><path d="M2.5 14h11"/></svg>';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function day(iso) {
  return String(iso || '').slice(0, 10);
}

function sizeText(bytes) {
  if (!bytes) return T.sizeUnknown;
  const mb = bytes / 1024 / 1024;
  return (mb >= 10 ? Math.round(mb) : mb.toFixed(1)) + ' MB';
}

function isNew(iso) {
  const at = Date.parse(iso);
  if (!at) return false;
  return (Date.now() - at) < NEW_DAYS * 24 * 60 * 60 * 1000;
}

function matches(item) {
  if (picked && item.id !== picked) return false;
  if (kind !== 'all' && (item.kind || 'unknown') !== kind) return false;
  if (!term) return true;
  return ((item.name || '') + ' ' + (item.about || '') + ' ' + (item.changelog || '')).toLowerCase().includes(term);
}


function cardHtml(item) {
  const letter = esc(String(item.name || '?').trim().charAt(0).toUpperCase());
  const badge = isNew(item.updatedAt) ? '<span class="badge">' + T.isNew + '</span>' : '';
  const meta = [sizeText(item.size), T.updatedLabel + ' ' + day(item.updatedAt),
    T.downloadsLabel + ' ' + (item.downloads || 0)].join(' \u00b7 ');
  return '<article class="card" data-id="' + esc(item.id) + '">' +
    '<div class="card-top"><div class="icon" style="background:' + iconColor(item.name) + '">' + letter + '</div>' +
    '<div class="title"><div class="name">' + esc(item.name) +
    '<span class="version">v' + esc(item.version) + '</span></div></div>' + badge + '</div>' +
    '<div class="card-body">' +
    '<div class="note">' + esc(item.about || item.changelog) + '</div>' +
    '<div class="meta">' + meta + '</div></div>' +
    '<a class="btn-primary" href="' + esc(item.downloadUrl) + '" data-get="1">' + ARROW + T.download + '</a>' +
    '</article>';
}

function emptyHtml(title, body) {
  return '<div class="empty"><b>' + title + '</b><p>' + body + '</p></div>';
}

function draw() {
  const list = document.getElementById('list');
  if (items.length === 0) {
    list.className = '';
    list.innerHTML = emptyHtml(T.emptyTitle, T.emptyBody);
    return;
  }
  const shown = items.filter(matches);
  if (!shown.length) {
    list.className = '';
    list.innerHTML = emptyHtml(T.noMatch, T.noMatchBody);
    return;
  }
  list.className = shown.length === 1 ? 'grid one' : 'grid';
  list.innerHTML = shown.map(cardHtml).join('');
  for (const card of list.querySelectorAll('.card')) {
    card.addEventListener('click', (e) => {
      if (e.target.dataset.get) return; // 받기 단추는 그냥 받게 둔다
      openDetail(card.dataset.id);
    });
  }
}

function drawStats() {
  const total = items.reduce((sum, i) => sum + (i.downloads || 0), 0);
  document.getElementById('stat-downloads').textContent = total;
  document.getElementById('stat-count').textContent = items.length;
}

function drawFilters() {
  const box = document.getElementById('filters');
  const present = ['all'].concat(['program', 'mobile', 'web', 'unknown'].filter(
    (k) => items.some((i) => (i.kind || 'unknown') === k)
  ));
  if (present.length <= 2) return;
  box.innerHTML = present.map((k) =>
    '<button class="chip" data-kind="' + k + '" aria-pressed="' + (k === kind) + '">' +
    (k === 'all' ? T.all : T.kinds[k]) + '</button>'
  ).join('');
  for (const button of box.querySelectorAll('.chip')) {
    button.addEventListener('click', () => { kind = button.dataset.kind; drawFilters(); draw(); });
  }
}


function olderHtml(history) {
  const rows = (history || []).filter((h) => h.url).map((h) =>
    '<li><span>v' + esc(h.version) + ' \u00b7 ' + day(h.releasedAt) + '</span>' +
    '<a href="' + esc(h.url) + '">' + T.download + '</a></li>'
  );
  return rows.length ? '<h3>' + T.detailOlder + '</h3><ul class="older">' + rows.join('') + '</ul>' : '';
}

function detailHtml(item, deploy) {
  const needs = T.needs[item.kind || 'unknown'] || T.needs.unknown;
  return '<h2>' + esc(item.name) + ' <span class="version">v' + esc(item.version) + '</span></h2>' +
    '<h3>' + T.detailAbout + '</h3><p>' + esc(item.about || item.changelog) + '</p>' +
    '<h3>' + T.detailChanged + '</h3><p>' + esc(item.changelog) + '</p>' +
    '<h3>' + T.detailNeeds + '</h3><p>' + needs + '</p>' +
    olderHtml(deploy && deploy.history) +
    '<div class="dialog-buttons"><a class="btn-primary" href="' + esc(item.downloadUrl) + '">' + T.download + '</a></div>';
}

async function openDetail(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const box = document.getElementById('detail');
  const body = document.getElementById('detail-body');
  body.innerHTML = detailHtml(item, null);
  box.showModal();
  try {
    const deploy = await fetch(item.deployJson + '?t=' + Date.now()).then((r) => r.json());
    body.innerHTML = detailHtml(item, deploy);
  } catch {
    // 지난 기록을 못 읽어도 나온 것은 그대로 보인다
  }
}

document.getElementById('search').addEventListener('input', (e) => {
  term = e.target.value.trim().toLowerCase();
  draw();
});
document.getElementById('detail-close').addEventListener('click', () => document.getElementById('detail').close());

fetch('index.json?t=' + Date.now())
  .then((r) => r.json())
  .then((data) => { items = (data && data.projects) || []; drawStats(); drawFilters(); draw(); })
  .catch(() => { items = []; drawStats(); draw(); });
