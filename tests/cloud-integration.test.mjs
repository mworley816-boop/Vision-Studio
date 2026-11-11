import test from 'node:test';import assert from 'node:assert/strict';import {validateUpload,requireStudioOwner,listCloudProjects,createCloudProject,createCloudProduction} from '../lib/cloud/studio-cloud.mjs';
const uid='123e4567-e89b-42d3-a456-426614174000';const pid='123e4567-e89b-42d3-a456-426614174001';
function mock({owner=true,projectKind='series'}={}){const calls=[];const client={auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},from(table){let op;const q={select(){return q},eq(){return q},order(){return Promise.resolve({data:[{id:pid,title:'Test',kind:'series'}],error:null})},maybeSingle:async()=>({data:owner?{user_id:uid}:null,error:null}),single:async()=>({data:op==='insert'?{id:pid,title:'Saved',budget_cents:projectKind==='series'?2000:500}:{id:pid,kind:projectKind},error:null}),insert(v){calls.push({table,v});op='insert';return q}};return q}};return {client,calls}}
test('valid private upload path',()=>{const path=validateUpload({ownerId:uid,projectId:pid,fileName:'song.mp3',bytes:100,mime:'audio/mpeg'});assert.match(path,new RegExp(`^${uid}/${pid}/`));assert.match(path,/\.mp3$/)});
test('disallow unsupported upload',()=>assert.throws(()=>validateUpload({ownerId:uid,projectId:pid,fileName:'x.exe',bytes:4,mime:'application/x-msdownload'})));
test('disallow oversized upload',()=>assert.throws(()=>validateUpload({ownerId:uid,projectId:pid,fileName:'x.mp3',bytes:104857601,mime:'audio/mpeg'})));
test('deny nonowner',async()=>assert.rejects(requireStudioOwner(mock({owner:false}).client),/denied/));
test('owner can list',async()=>assert.equal((await listCloudProjects(mock().client)).length,1));
test('create project validates type',async()=>assert.rejects(createCloudProject(mock().client,{title:'x',kind:'other'}),/type/));
test('episode production has $20 budget',async()=>{const {client,calls}=mock();await createCloudProduction(client,{projectId:pid,title:'Episode 1'});assert.equal(calls[0].v.budget_cents,2000)});
test('music production has $5 budget',async()=>{const {client,calls}=mock({projectKind:'music'});await createCloudProduction(client,{projectId:pid,title:'Song'});assert.equal(calls[0].v.budget_cents,500)});
