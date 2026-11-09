// node check.js — 판정/파일 형식 확인
const assert = require('assert');
require('vm').runInThisContext(require('fs').readFileSync(__dirname + '/format.js', 'utf8'));

assert.equal(isPassed('테스트 1\n실행 결과 〉\t실행한 결괏값 765이 기댓값 45과 다릅니다.\n\n테스트 결과 (~˘▾˘)~\n1개 중 0개 성공'), false);
assert.equal(isPassed('테스트 결과 (~˘▾˘)~\n2개 중 2개 성공'), true);
assert.equal(isPassed('테스트 1 〉\t통과 (10.14ms, 9.13MB)\n채점 결과\n정확성: 100.0\n합계: 100.0 / 100.0'), true);
assert.equal(isPassed('테스트 3 〉\t실패 (시간 초과)\n채점 결과\n정확성: 85.0\n합계: 85.0 / 100.0'), false);

const a = { kind: '제출', id: '340206', level: '0', title: '[PCCE 기출문제] 2번 / 각도 합치기', url: 'u', language: 'python3', code: 'print(1)\n', output: '합계: 100.0 / 100.0', passed: true, at: '2026-11-08T06:10:57Z', memo: '첫 줄\n둘째 줄' };
assert.equal(problemPath(a), 'programmers/lv0/340206-[PCCE기출문제]2번각도합치기.md');
assert.equal(problemPath({ ...a, level: undefined }), 'programmers/etc/340206-[PCCE기출문제]2번각도합치기.md');
const text = fileHeader(a) + attemptSection(a, 1);
assert.equal(nextAttemptNo(text), 2);
assert.ok(text.includes('````python\nprint(1)\n````'));
assert.ok(text.includes('> 📝 **메모**\n> 첫 줄\n> 둘째 줄'));
assert.ok(!attemptSection({ ...a, memo: '' }, 1).includes('메모'));
const ref = refSection({ ...a, kind: '참고', source: 'https://x/solution_groups', memo: '좋은 아이디어' });
assert.ok(ref.startsWith('\n## 💡 참고 풀이'));
assert.ok(ref.includes('> 좋은 아이디어') && !ref.includes('결과 보기'));
assert.equal(nextAttemptNo(text + ref), 2); // 참고 풀이는 시도 번호에 안 셈
console.log('ok');
