from pathlib import Path
import re
root=Path('fit74')

# workout player: use the new visual renderer for exercises + simple warm-up/cooldown steps
p=root/'workout.js'
s=p.read_text()
s=s.replace("['Круги тазом','30 сек','Небольшая амплитуда, без резких движений.']","['Кошка-корова','30 сек','Плавно прогни и округли спину, без резких движений.']")
s=s.replace("['Круги тазом','30 сек','Небольшая контролируемая амплитуда.']","['Кошка-корова','30 сек','Плавно прогни и округли спину, без резких движений.']")
s=s.replace('${exerciseVisualHTML(ex)}','${window.Fit74Visuals?.exercise(ex)||inlineTechSVG(ex)}')
s=s.replace('${inlineTechSVG(ex)}','${window.Fit74Visuals?.exercise(ex)||inlineTechSVG(ex)}')
if '${window.Fit74Visuals?.simple(s)||\'\'}' not in s:
    needle='<p class="exercise-tip">${esc(s.tip||\'\')}</p><button id="simpleDone"'
    repl='<p class="exercise-tip">${esc(s.tip||\'\')}</p>${window.Fit74Visuals?.simple(s)||\'\'}<button id="simpleDone"'
    if needle not in s:
        raise SystemExit('simple visual insertion point missing')
    s=s.replace(needle,repl,1)
p.write_text(s)

# index: direct, explicit loading order; remove the abandoned technique module
p=root/'index.html'; h=p.read_text()
h=re.sub(r'\n\s*<link rel="stylesheet" href="\./technique\.css\?v=\d+">','',h)
h=re.sub(r'\n\s*<script src="\./technique\.js\?v=\d+"></script>','',h)
h=h.replace('./workout.css?v=1','./workout.css?v=4')
h=h.replace('./workout.js?v=1','./workout.js?v=4')
if './visuals-v4.css?v=1' not in h:
    h=h.replace('<link rel="stylesheet" href="./workout.css?v=4">','<link rel="stylesheet" href="./workout.css?v=4">\n<link rel="stylesheet" href="./visuals-v4.css?v=1">',1)
if './visuals-v4.js?v=1' not in h:
    h=h.replace('<script src="./workout.js?v=4"></script>','<script src="./visuals-v4.js?v=1"></script>\n<script src="./workout.js?v=4"></script>',1)
p.write_text(h)

# service worker: new cache namespace and explicit new files
p=root/'sw.js'; sw=p.read_text()
sw=re.sub(r"const CACHE='[^']+'","const CACHE='fit74-v13-visuals-v4'",sw,count=1)
sw=sw.replace("'./workout.css?v=1'","'./workout.css?v=4'").replace("'./workout.js?v=1'","'./workout.js?v=4'")
sw=sw.replace(",'./technique.css?v=3','./technique.js?v=3'",'').replace(",'./technique.css?v=2','./technique.js?v=2'",'')
for asset in ["'./visuals-v4.css?v=1'","'./visuals-v4.js?v=1'"]:
    if asset not in sw:
        sw=sw.replace("'./manifest.webmanifest'",asset+",'./manifest.webmanifest'",1)
p.write_text(sw)

print('Fit74 visual v4 integrated')
