// Curriculum-wide content checks: every lesson, every item.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, TAG_TO_ERROR_CATEGORY } from '../src/learning/content/index.js';
import { checkFormalItem, checkQuantifiedItem } from '../src/learning/logic.js';
import { SKILL_BY_ID, validateSkillGraph } from '../src/learning/skills.js';
import { fingerprintQuestion, screenDuplicate } from '../src/learning/questionValidation.js';
import { SKILL_SPECS, buildGenerationRequest, requestToPrompt } from '../src/learning/practiceEngine.js';

test('skill graph still valid after adding lessons', () => assert.deepEqual(validateSkillGraph(), []));

for (const L of LESSONS) {
  test(`${L.title}: registered, structured, and honest about review status`, () => {
    assert.equal(SKILL_BY_ID[L.skillId]?.lesson, 'full', 'skill marked as having a full lesson');
    for (const k of ['objective', 'why', 'sections', 'workedExamples', 'misconceptions', 'counterexample', 'tagToSection']) assert.ok(L[k], k);
    assert.ok(L.objective.startsWith('By the end, you will be able to'));
    assert.notEqual(L.review.status, 'approved');
    const n = (s) => L.items.filter(i => i.stage === s).length;
    assert.equal(n('learn'), 1); assert.ok(n('recognize') >= 4); assert.ok(n('apply') >= 2); assert.ok(n('challenge') >= 2); assert.ok(n('mastery_check') >= 3);
    assert.equal(new Set(L.items.map(i => i.id)).size, L.items.length, 'unique item ids');
    for (const id of L.placementItemIds) assert.ok(L.items.find(i => i.id === id), 'placement item ' + id);
    for (const m of L.misconceptions) assert.ok(L.tagToSection[m.tag] && L.sections.some(s => s.id === L.tagToSection[m.tag]), `misconception ${m.tag} links to a section`);
  });

  test(`${L.title}: every answer key is verified (truth table / model check) or explicitly author-verified`, () => {
    for (const it of L.items) {
      if (it.formal?.kind === 'quantified') { const r = checkQuantifiedItem(it); assert.ok(r.ok, `${it.id}: ${r.problems.join('; ')}`); }
      else if (it.formal) { const r = checkFormalItem(it); assert.ok(r.ok, `${it.id}: ${r.problems.join('; ')}`); assert.deepEqual(Object.keys(it.formal.choices).sort(), Object.keys(it.choices).sort(), it.id); }
      else assert.ok(it.verifiedBy === 'author' || it.stage === 'learn', `${it.id} has neither a formal check nor an author-verification mark`);
    }
  });

  test(`${L.title}: every wrong choice is explained, tagged, and mapped to remediation`, () => {
    for (const it of L.items) {
      assert.ok(it.rationale && it.choices[it.correct], it.id);
      for (const c of Object.keys(it.choices)) {
        if (c === it.correct) continue;
        assert.ok(it.distractorRationales?.[c], `${it.id} rationale ${c}`);
        const tag = it.distractorTags?.[c];
        assert.ok(tag && TAG_TO_ERROR_CATEGORY[tag], `${it.id} tag ${c}: ${tag}`);
        assert.ok(L.tagToSection[tag], `${it.id} tag ${tag} has a remediation section`);
      }
      if (it.stage === 'apply') assert.ok(it.hints?.length >= 2, `${it.id} graduated hints`);
    }
  });

  test(`${L.title}: generator can be asked for this skill with lesson context`, () => {
    assert.ok(SKILL_SPECS[L.skillId], 'generation spec exists');
    const p = requestToPrompt(buildGenerationRequest({ skillId: L.skillId, stage: 'challenge', difficulty: 2 }, () => 0.5));
    assert.ok(p.includes('LEARNING OBJECTIVE') && p.includes('LESSON STAGE: challenge'));
  });
}

test('no near-duplicate items across the whole curriculum (outside short recognition items)', () => {
  const all = LESSONS.flatMap(L => L.items.filter(i => !['recognize', 'learn'].includes(i.stage)));
  const fps = all.map(i => fingerprintQuestion({ stimulus: i.stimulus, question: i.stem }));
  fps.forEach((fp, i) => { const d = screenDuplicate(fp, fps.slice(0, i)); assert.ok(!d.duplicate, `${all[i].id} looks like an earlier item (${d.kind} ${d.score?.toFixed?.(2)})`); });
});
