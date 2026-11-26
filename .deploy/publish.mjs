/* Публикация приложения на GitHub Pages через API */
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.GH_TOKEN;
const OWNER = process.env.GH_OWNER;
const REPO = process.env.GH_REPO || 'atlet';
const DIR = process.env.DEPLOY_DIR || '.';
const API = 'https://api.github.com';

if (!TOKEN || !OWNER) {
  console.error('Нужны GH_TOKEN и GH_OWNER');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'atlet-deploy',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function api(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

async function apiSafe(method, url, body) {
  try {
    return { ok: true, data: await api(method, url, body) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* ---------- сбор файлов ---------- */
const SKIP_DIRS = new Set(['.git', 'node_modules', '.shots', '.verify', '.verify-sa', 'docs-checks']);
const SKIP_FILES = new Set(['atlet-server.log', 'server.py', 'ЗАПУСТИТЬ.bat', '.gitignore', 'build-standalone.mjs', 'build-debug.mjs', 'build-debug2.mjs']);

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...walk(path.join(dir, e.name), rel));
    } else {
      if (SKIP_FILES.has(e.name)) continue;
      if (e.name.startsWith('_')) continue;
      out.push(rel);
    }
  }
  return out;
}

const files = walk(DIR).sort();
console.log('файлов к загрузке:', files.length);

/* ---------- репозиторий ---------- */
const user = await api('GET', '/user');
console.log('аккаунт:', user.login);

const repoCheck = await apiSafe('GET', `/repos/${OWNER}/${REPO}`);
let repo;
if (repoCheck.ok) {
  console.log('репозиторий уже существует');
  repo = repoCheck.data;
} else {
  repo = await api('POST', '/user/repos', {
    name: REPO,
    description: 'Атлет — дневник тренировок (PWA для iPhone)',
    private: false,
    auto_init: false,
    has_issues: false,
    has_wiki: false,
  });
  console.log('репозиторий создан:', repo.full_name);
}

/* ---------- инициализация пустого репозитория ---------- */
const refInit = await apiSafe('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
if (!refInit.ok) {
  // GitHub не даёт создавать blobs в пустом репозитории — создаём стартовый README
  try {
    await api('PUT', `/repos/${OWNER}/${REPO}/contents/README.md`, {
      message: 'Инициализация',
      content: Buffer.from('# Атлет\n\nДневник тренировок.\n', 'utf8').toString('base64'),
      branch: 'main',
    });
    console.log('репозиторий инициализирован');
  } catch (e) {
    // возможно, README уже есть — пробуем получить ref ещё раз
    console.log('инициализация:', e.message.slice(0, 120));
  }
  await new Promise((r) => setTimeout(r, 1500));
}

/* ---------- blobs ---------- */
const blobs = [];
for (const rel of files) {
  const buf = fs.readFileSync(path.join(DIR, rel));
  if (buf.length > 45 * 1024 * 1024) {
    console.log('пропуск большого файла', rel);
    continue;
  }
  const res = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
    content: buf.toString('base64'),
    encoding: 'base64',
  });
  blobs.push({ path: rel, mode: '100644', type: 'blob', sha: res.sha });
}
console.log('blobs загружены:', blobs.length);

/* ---------- ветка и коммит ---------- */
let baseCommit = null;
const refCheck = await apiSafe('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
if (refCheck.ok) baseCommit = refCheck.data.object.sha;
else {
  // возможно, репозиторий пуст — пробуем создать main с пустого дерева
}

const tree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
  tree: blobs,
});
console.log('дерево:', tree.sha.slice(0, 8));

const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
  message: 'Публикация приложения «Атлет»',
  tree: tree.sha,
  parents: baseCommit ? [baseCommit] : [],
});
console.log('коммит:', commit.sha.slice(0, 8));

if (baseCommit) {
  await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
} else {
  await api('POST', `/repos/${OWNER}/${REPO}/git/refs`, { ref: 'refs/heads/main', sha: commit.sha });
}
console.log('ветка main обновлена');

/* ---------- GitHub Pages ---------- */
const pagesCheck = await apiSafe('GET', `/repos/${OWNER}/${REPO}/pages`);
if (!pagesCheck.ok) {
  const pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
    source: { branch: 'main', path: '/' },
  });
  console.log('Pages включён:', pages.html_url || '');
} else {
  console.log('Pages уже включён:', pagesCheck.data.html_url);
  await apiSafe('POST', `/repos/${OWNER}/${REPO}/pages/builds`);
}

const pagesInfo = await api('GET', `/repos/${OWNER}/${REPO}/pages`);
console.log('URL:', pagesInfo.html_url);
console.log('status:', pagesInfo.status);
