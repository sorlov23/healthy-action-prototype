import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require('sharp');
const out=new URL('../fit74/assets/impulse/',import.meta.url);
await mkdir(out,{recursive:true});
const tiles={A:[0,0],B:[1200,600],GLUTES:[1200,300],CARDIO:[300,600],LIGHT:[0,2400]};
for(const [code,[left,top]] of Object.entries(tiles))await sharp(new URL('../fit74/assets/technique-cards/poses.webp',import.meta.url).pathname).extract({left,top,width:300,height:300}).webp({quality:92}).toFile(new URL(code.toLowerCase()+'.webp',out).pathname);
