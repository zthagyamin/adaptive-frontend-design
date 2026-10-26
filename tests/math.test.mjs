import test from 'node:test';
import assert from 'node:assert/strict';
import {criticalStep,brakeForTarget} from '../skills/adaptive-frontend-design/assets/motion/retarget.mjs';
import {fovForPlaneHeight,planeForDomRect,viewportForDomRect} from '../skills/adaptive-frontend-design/assets/motion/projection.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('critical integration composes over elapsed time for a fixed target',()=>{
  const start={position:0,velocity:1.2};const full=criticalStep(start,1,.4,12);
  const split=criticalStep(criticalStep(start,1,.15,12),1,.25,12);
  close(full.position,split.position);close(full.velocity,split.velocity);
  assert.deepEqual(start,{position:0,velocity:1.2});
});
test('rest and invalid motion inputs have defined behavior',()=>{
  assert.deepEqual(criticalStep({position:3,velocity:0},3,1,8),{position:3,velocity:0});
  assert.throws(()=>criticalStep({position:0,velocity:0},1,-1,10),RangeError);
  assert.throws(()=>criticalStep({position:0,velocity:NaN},1,.1,10),RangeError);
});
test('near-target braking bounds momentum without moving the object',()=>{
  const velocity=brakeForTarget(100,.01,12);assert.ok(velocity>0&&velocity<.12);
  for(const dt of [.01,.2,2])assert.ok(criticalStep({position:0,velocity},.01,dt,12).position<=.01+1e-12);
  assert.equal(Math.abs(brakeForTarget(-20,0,12)),0);
});
test('FOV helper describes the requested camera-plane height at zoom',()=>{
  const fov=fovForPlaneHeight(6,10,2);close(2*10*Math.tan(fov*Math.PI/360)/2,6);
  assert.throws(()=>fovForPlaneHeight(1,0),RangeError);
});
test('DOM-plane geometry round trips center and dimensions in CSS pixels',()=>{
  const canvas={left:120,top:60,width:800,height:600},rect={left:320,top:160,width:200,height:150};
  const result=planeForDomRect({canvas,rect,distance:10,fov:60,zoom:2});const unit=2*10*Math.tan(Math.PI/6)/(2*canvas.height);
  close(canvas.left+canvas.width/2+result.position[0]/unit,rect.left+rect.width/2);
  close(canvas.top+canvas.height/2-result.position[1]/unit,rect.top+rect.height/2);
  close(result.width/unit,rect.width);close(result.height/unit,rect.height);
  assert.equal(planeForDomRect({canvas,rect:{...rect,width:0},distance:10,fov:60}),null);
});
test('viewport and scissor preserve full layout while clipping visible pixels',()=>{
  const result=viewportForDomRect({left:100,top:50,width:200,height:100},{left:50,top:0,width:150,height:80});
  assert.deepEqual(result.viewport,[-50,70,150,80]);assert.deepEqual(result.scissor,[0,70,100,30]);assert.equal(result.visible,true);
  assert.equal(viewportForDomRect({left:0,top:0,width:100,height:100},{left:150,top:0,width:20,height:20}).visible,false);
});
