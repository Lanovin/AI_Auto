import { readFile } from 'fs/promises';
import path from 'path';

const pageMap = {
  popisky: 'popisky.html',
  monitoring: 'market-monitor.html',
  profil: 'profil.html',
  skaut: 'skaut.html'
};

const assetMap = {
  'popisky.js': { fileName: 'popisky.js', contentType: 'application/javascript; charset=utf-8' },
  'shared.js': { fileName: 'shared.js', contentType: 'application/javascript; charset=utf-8' },
  'style.css': { fileName: 'style.css', contentType: 'text/css; charset=utf-8' }
};

const routeReplacements = [
  ['index.html', '/'],
  ['ceny.html', '/odhad-ceny'],
  ['popisky.html', '/popisky'],
  ['market-monitor.html', '/monitoring'],
  ['skaut.html', '/skaut'],
  ['profil.html', '/profil']
];

const assetReplacements = [
  ['href="style.css"', 'href="/legacy-assets/style.css"'],
  ['src="shared.js"', 'src="/legacy-assets/shared.js"'],
  ['src="popisky.js"', 'src="/legacy-assets/popisky.js"']
];

function getWorkspacePath(fileName) {
  return path.join(process.cwd(), fileName);
}

function rewriteLegacyHtml(html) {
  let nextHtml = html.replace(/<nav class="site-nav">[\s\S]*?<\/nav>/, '');
  // Legacy patička je v rámci iframe navíc — hlavní web má vlastní.
  nextHtml = nextHtml.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, '');

  assetReplacements.forEach(([from, to]) => {
    nextHtml = nextHtml.split(from).join(to);
  });

  routeReplacements.forEach(([from, to]) => {
    nextHtml = nextHtml.split(from).join(to);
  });

  if (!nextHtml.includes('<base target="_top">')) {
    nextHtml = nextHtml.replace('</head>', '    <base target="_top">\n</head>');
  }

  return nextHtml;
}

export async function readLegacyPage(pageKey) {
  const fileName = pageMap[pageKey];
  if (!fileName) {
    return null;
  }

  const html = await readFile(getWorkspacePath(fileName), 'utf8');
  return rewriteLegacyHtml(html);
}

export async function readLegacyAsset(assetName) {
  const asset = assetMap[assetName];
  if (!asset) {
    return null;
  }

  const content = await readFile(getWorkspacePath(asset.fileName), 'utf8');
  return {
    content,
    contentType: asset.contentType
  };
}
