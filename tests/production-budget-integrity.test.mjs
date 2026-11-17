import test from 'node:test';
import assert from 'node:assert/strict';
import {productionBudgetIsValid} from '../lib/cloud/production-budget-integrity.mjs';
test('music requires exactly five dollars and episode exactly twenty dollars',()=>{
 assert.equal(productionBudgetIsValid('music',500),true);
 assert.equal(productionBudgetIsValid('episode',2000),true);
 for(const [kind,cap] of [['music',2000],['episode',500],['music',0],['episode',null],['series',2000],['music','500']]){
  assert.equal(productionBudgetIsValid(kind,cap),false);
 }
});
