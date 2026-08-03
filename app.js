const T = {"download":"내려받기","versionLabel":"버전","updatedLabel":"올린 날","emptyTitle":"아직 올린 프로그램이 없어요","emptyBody":"프로그램을 하나 공개하면 여기에 나타납니다.","noMatch":"찾는 것이 없어요","all":"전체","kinds":{"program":"프로그램","mobile":"모바일","web":"웹","unknown":"기타"}};
let items = [];
let kind = 'all';
let term = '';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function matches(item) {
  if (kind !== 'all' && (item.kind || 'unknown') !== kind) return false;
  if (!term) return true;
  return ((item.name || '') + ' ' + (item.changelog || '')).toLowerCase().includes(term);
}

function cardHtml(item) {
  return '<article class="card"><div class="card-main">' +
    '<div class="card-name">' + esc(item.name) + '</div>' +
    '<div class="card-note">' + esc(item.changelog) + '</div>' +
    '<div class="card-meta">' + T.versionLabel + ' ' + esc(item.version) +
    ' \u00b7 ' + T.updatedLabel + ' ' + esc(String(item.updatedAt).slice(0, 10)) + '</div>' +
    '</div><a class="btn-primary" href="' + esc(item.downloadUrl) + '">' + T.download + '</a></article>';
}

function draw() {
  const list = document.getElementById('list');
  if (items.length === 0) {
    list.innerHTML = '<div class="empty"><p>' + T.emptyTitle + '</p><p>' + T.emptyBody + '</p></div>';
    return;
  }
  const shown = items.filter(matches);
  list.innerHTML = shown.length ? shown.map(cardHtml).join('') : '<div class="empty"><p>' + T.noMatch + '</p></div>';
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

document.getElementById('search').addEventListener('input', (e) => {
  term = e.target.value.trim().toLowerCase();
  draw();
});

fetch('index.json?t=' + Date.now())
  .then((r) => r.json())
  .then((data) => { items = (data && data.projects) || []; drawFilters(); draw(); })
  .catch(() => { items = []; draw(); });
