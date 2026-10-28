import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000},offline:process.env.OFFLINE==='1'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(process.env.HTML_PATH){
  await page.setContent(await readFile(process.env.HTML_PATH,'utf8'),{waitUntil:'load'});
 }else{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:5173');
 }
 await page.waitForFunction(()=>window.__littleTown?.renderer.info.render.calls>0);
 await page.keyboard.press('Space');
 assert.equal(await page.evaluate(()=>window.__littleTown.sim.state.paused),true);
 const before=await page.evaluate(()=>window.__littleTown.sim.state.food);
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__littleTown.sim.state.food),before);
 await page.getByRole('button',{name:'Construir Vivienda',exact:true}).click();
 const info=await page.evaluate(()=>{const {camera,world,sim}=window.__littleTown;const v=camera.position.clone().set(30,0,-15).project(camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2,count:world.buildings.length,wood:sim.state.wood};});
 await page.mouse.click(info.x,info.y);
 assert.equal(await page.evaluate(()=>window.__littleTown.world.buildings.length),info.count+1);
 assert.equal(await page.evaluate(()=>window.__littleTown.sim.state.wood),info.wood-20);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.__littleTown.sim.state.selected),null);
 await page.keyboard.press('Digit3');
 assert.equal(await page.evaluate(()=>window.__littleTown.sim.state.selected),'farm');
 await page.keyboard.press('Escape');
 await page.screenshot({path:'/tmp/little-town-final.png'});
 const stats=await page.evaluate(()=>({drawCalls:window.__littleTown.renderer.info.render.calls,triangles:window.__littleTown.renderer.info.render.triangles,buildings:window.__littleTown.world.buildings.length}));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/little-town-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('Browser smoke passed: renderer, pause, actual construction, resource debit, shortcuts, mobile layout, no console errors.',stats);
}finally{await browser.close();}
