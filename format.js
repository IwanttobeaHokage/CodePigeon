// content.js / background.js / check.js 가 같이 쓰는 순수 함수들

// 실행: "N개 중 M개 성공", 제출: "합계: X / 100.0" 을 보고 판정
function isPassed(output) {
  const run = output.match(/(\d+)개 중 (\d+)개 성공/);
  if (run) return run[1] === run[2];
  const total = output.match(/합계:\s*([\d.]+)\s*\/\s*([\d.]+)/);
  if (total) return Number(total[1]) === Number(total[2]);
  return !/실패|시간 초과|에러|Error|런타임/.test(output);
}

function problemPath(a) {
  const level = /^[0-5]$/.test(a.level) ? `lv${a.level}` : 'etc';
  return `programmers/${level}/${a.id}-${a.title.replace(/[\\/:*?"<>|\s]+/g, '')}.md`;
}

function fileHeader(a) {
  return `# [Lv.${a.level}] ${a.title}\n\n[문제 링크](${a.url}) · 문제 번호 ${a.id}\n`;
}

const FENCE_LANG = { python3: 'python', python: 'python', javascript: 'js' };

const when = (a) => new Date(a.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const codeBlock = (a) => '````' + (FENCE_LANG[a.language] || a.language) + '\n' + a.code.trimEnd() + '\n````\n';
const memoBlock = (a) => (a.memo?.trim() ? '\n> 📝 **메모**\n' + a.memo.trim().split('\n').map((l) => `> ${l}`).join('\n') + '\n' : '');

function attemptSection(a, n) {
  let s = `\n## #${n} · ${a.kind} · ${a.passed ? '✅ 성공' : '❌ 실패'} · ${when(a)}\n\n`;
  s += codeBlock(a) + '\n';
  s += '<details><summary>결과 보기</summary>\n\n````\n' + a.output.trim() + '\n````\n\n</details>\n';
  return s + memoBlock(a);
}

// 다른 사람 풀이 — 시도 번호(#n)에는 안 셈
function refSection(a) {
  return `\n## 💡 참고 풀이 · ${when(a)}\n\n[풀이 페이지](${a.source})\n\n` + codeBlock(a) + memoBlock(a);
}

// 파일에 이미 있는 시도 수 + 1
const nextAttemptNo = (text) => (text.match(/^## #/gm) || []).length + 1;
