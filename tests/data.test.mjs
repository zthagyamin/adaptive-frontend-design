import test from 'node:test';
import assert from 'node:assert/strict';
import {stations,seasons,notes,species} from '../examples/migration-field-guide/data.js';

test('each seasonal route pairs every stop with the matching note in that season',()=>{
  const referenced=[];
  for(const [season,route] of Object.entries(seasons)){
    assert.equal(route.order.length,route.notes.length,`${season}: stop/note count`);
    assert.equal(route.order.length,route.sub.length,`${season}: stop/caption count`);
    assert.equal(new Set(route.order).size,route.order.length,`${season}: duplicate stops`);
    route.order.forEach((station,index)=>{
      assert.ok(Object.hasOwn(stations,station),`${season}: unknown station ${station}`);
      const id=route.notes[index];assert.ok(Object.hasOwn(notes,id),`${season}: unknown note ${id}`);
      assert.equal(notes[id].season,season,`${id}: seasonal navigation would cross seasons`);
      assert.equal(notes[id].station,station,`${id}: map action would open the wrong place`);referenced.push(id);
    });
  }
  assert.deepEqual(referenced.sort(),Object.keys(notes).sort(),'every note belongs to exactly one route');
});

test('station defaults and species record links resolve and agree in both directions',()=>{
  for(const [station,item] of Object.entries(stations)){
    assert.ok(Object.hasOwn(notes,item.note),`${station}: default note exists`);
    assert.equal(notes[item.note].station,station,`${station}: default note belongs here`);
    assert.ok(item.point.length===3&&item.point.every(Number.isFinite),`${station}: finite map point`);
  }
  const indexed=[];
  for(const [group,item] of Object.entries(species)){
    assert.equal(new Set(item.records).size,item.records.length,`${group}: duplicate related links`);
    for(const id of item.records){assert.ok(Object.hasOwn(notes,id),`${group}: missing related note ${id}`);assert.equal(notes[id].species,group,`${id}: wrong species index`);indexed.push(id)}
  }
  for(const [id,note] of Object.entries(notes)){
    assert.ok(Object.hasOwn(stations,note.station),`${id}: station exists`);assert.ok(Object.hasOwn(species,note.species),`${id}: species exists`);
  }
  assert.deepEqual(indexed.sort(),Object.keys(notes).sort(),'every note appears in exactly one matching species index');
});
