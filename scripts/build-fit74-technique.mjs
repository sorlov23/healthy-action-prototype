// Usage: node scripts/build-fit74-technique.mjs /path/to/original-cards
// Requires sharp. Reuses illustrations without regenerating the people/poses.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const sourceDir=process.argv[2];
if(!sourceDir)throw new Error('Pass the directory containing the original workout cards.');
const manifest=JSON.parse(await readFile(join(root,'scripts/fit74-technique-sources.json'),'utf8'));
const frames=Object.values(manifest.scenes).flatMap(scene=>scene.frames);
const size=manifest.tileSize,columns=manifest.columns;
const width=size*columns,height=Math.ceil(frames.length/columns)*size;
const tiles=[];
for(let i=0;i<frames.length;i++){
  const frame=frames[i], [left,top,width,height]=frame.rect;
  const source=manifest.sources[frame.sheet];
  const sourcePath=typeof source==='string'?join(sourceDir,source):join(root,source.projectFile);
  const input=await sharp(sourcePath).extract({left,top,width,height}).png().toBuffer();
  const covers=(frame.covers||[]).map(r=>({input:Buffer.from(`<svg width="${r[2]}" height="${r[3]}"><rect width="100%" height="100%" fill="#fff"/></svg>`),left:r[0]-left,top:r[1]-top}));
  const cropped=await sharp(input).composite(covers).png().toBuffer();
  const tile=await sharp(cropped).resize(size-16,size-16,{fit:'contain',background:'#fff'}).extend({top:8,bottom:8,left:8,right:8,background:'#fff'}).png().toBuffer();
  tiles.push({input:tile,left:(i%columns)*size,top:Math.floor(i/columns)*size});
}
const out=join(root,'fit74/assets/technique-cards');
await mkdir(out,{recursive:true});
await sharp({create:{width,height,channels:3,background:'#fff'}}).composite(tiles).webp({quality:94,effort:6}).toFile(join(out,'poses.webp'));
await writeFile(join(out,'layout.json'),JSON.stringify({width,height,tileSize:size,columns,frames:frames.length},null,2)+'\n');
console.log(JSON.stringify({width,height,frames:frames.length,scenes:Object.keys(manifest.scenes).length}));
