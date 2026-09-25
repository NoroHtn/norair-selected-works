"""Build shared project pages from the existing, verified games.json catalog."""
from pathlib import Path
from html import escape as E
import json,re
ROOT=Path(__file__).resolve().parents[1]
GAMES=json.loads((ROOT/'assets/games.json').read_text())

def detail(game,index,prefix='',modal=False):
    title=E(game['title']); url=E(game['playUrl']); count=f'{index+1:02d} / {len(GAMES):02d}'
    previous=GAMES[(index-1)%len(GAMES)]; following=GAMES[(index+1)%len(GAMES)]
    if modal:
        nav='<button type="button" data-game-prev aria-label="Previous game">←</button><button type="button" data-game-next aria-label="Next game">→</button><button type="button" class="game-close" data-game-close aria-label="Close game viewer">×</button>'
    else:
        nav=f'<a href="../{previous["id"]}/" data-game-prev aria-label="Previous game: {E(previous["title"])}">←</a><a href="../{following["id"]}/" data-game-next aria-label="Next game: {E(following["title"])}">→</a><a href="../../index.html#{game["group"]}" class="game-close" data-game-close aria-label="Back to portfolio">×</a>'
    heading='h2' if modal else 'h1'; ident='game-dialog-title' if modal else 'game-page-title'
    gallery=''.join(f'<button class="game-gallery-item{(" is-active" if i==0 else "")}" type="button" data-game-image-src="{E(prefix+im["src"])}" data-game-image-alt="{E(im["alt"])}" aria-label="Show {E(im["alt"])}" aria-pressed="{str(i==0).lower()}"><img src="{E(prefix+im["src"])}" alt="{E(im["alt"])}" loading="lazy" width="120" height="80"></button>' for i,im in enumerate(game['images']))
    video=''
    if game.get('video'):
        video=f'<video class="game-gallery-video" controls playsinline muted preload="none" poster="{E(prefix+game["cover"])}" aria-label="{title} cinematic"><source src="{E(prefix+game["video"])}" type="video/mp4"></video>'
    return f'''<div class="game-view-content">
    <div class="game-toolbar"><div class="game-toolbar-label"><strong data-game-count>{count}</strong><span data-game-label>{title} · {E(game['category'])}</span></div><div class="game-toolbar-actions"><a class="game-play-small" data-game-play-short href="{url}" target="_blank" rel="noopener noreferrer">Play game <span aria-hidden="true">↗</span></a><div class="game-nav">{nav}</div></div></div>
    <div class="game-detail">
      <section class="game-hero" aria-label="Game artwork"><img class="game-ambient" data-game-ambient src="{E(prefix+game['cover'])}" alt="" aria-hidden="true"><div class="game-art-frame"><img data-game-cover src="{E(prefix+game['cover'])}" alt="{title} key art" width="1200" height="1200" fetchpriority="high"></div></section>
      <section class="game-info"><div class="game-story"><p class="game-eyebrow">GAME ART / <span data-game-category>{E(game['category'])}</span></p><{heading} id="{ident}" data-game-title>{title}</{heading}><p class="game-description" data-game-description>{E(game['description'])}</p><p class="game-credit" data-game-credit>{E(game['credit'])}</p></div><aside class="game-facts" aria-label="Project details"><dl><div><dt>Company</dt><dd data-game-company>Pascal Gaming</dd></div><div><dt>Category</dt><dd data-game-category>{E(game['category'])}</dd></div><div><dt>Portfolio focus</dt><dd>Game art &amp; production</dd></div><div><dt>Project</dt><dd>Team-delivered</dd></div></dl><div class="game-play-block"><a class="game-play" data-game-play href="{url}" target="_blank" rel="noopener noreferrer">Play {title} <span aria-hidden="true">↗</span></a><p data-game-play-note>Opens on Pascal Gaming · select Play on the game page</p></div><a class="game-official" data-game-official href="{E(game['officialUrl'])}" target="_blank" rel="noopener noreferrer">Official game information ↗</a></aside></section>
      <section class="game-artwork-section" aria-label="Artwork and game screens"><div class="game-gallery-heading"><h3>Artwork &amp; screens</h3><span>Select an image to explore</span></div><div class="game-gallery" data-game-gallery>{gallery}{video}</div></section>
    </div></div>'''

for index,game in enumerate(GAMES):
    p=ROOT/'work'/game['id']/'index.html'; s=p.read_text()
    s=re.sub(r'<main id="main">.*?</main>', '<main id="main">'+detail(game,index,'../../')+'</main>',s,flags=re.S)
    s=s.replace('<body>',f'<body class="project-page" data-project-id="{game["id"]}">')
    s=s.replace('</head>','<link rel="stylesheet" href="../../assets/game-viewer.css?v=7-red"><script defer src="../../assets/game-viewer.js?v=6"></script></head>') if 'assets/game-viewer.css' not in s else s
    s=s.replace('assets/presentation.css?v=4','assets/presentation.css?v=6').replace('assets/site.js?v=4','assets/site.js?v=6')
    p.write_text(s)
p=ROOT/'index.html';s=p.read_text()
s=s.replace('</head>','<link rel="stylesheet" href="assets/game-viewer.css?v=7-red"><script defer src="assets/game-viewer.js?v=6"></script></head>') if 'assets/game-viewer.css' not in s else s
s=s.replace('assets/presentation.css?v=5','assets/presentation.css?v=6').replace('assets/site.js?v=5','assets/site.js?v=6')
dialog='<dialog class="game-viewer" aria-labelledby="game-dialog-title">'+detail(GAMES[0],0,modal=True)+'</dialog>'
if '<dialog class="game-viewer"' not in s:s=s.replace('</body>',dialog+'</body>')
else:s=re.sub(r'<dialog class="game-viewer".*?</dialog>',dialog,s,flags=re.S)
p.write_text(s)
print('Built reference-based detail markup for 26 pages and the homepage viewer')
