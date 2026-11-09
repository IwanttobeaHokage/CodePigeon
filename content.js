// 실행/제출 버튼 클릭 → 결과창이 다 채워질 때까지 기다림 → 기록
// 실행, 틀린 제출은 바로 올리고 / 맞은 제출은 메모 창을 띄운 뒤 올린다
const isRun = (el) => el.id === 'run-code' || /코드 실행/.test(el.textContent);
const isSubmit = (el) => el.id === 'submit-code' || /제출 후 채점/.test(el.textContent);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, a');
  if (!btn) return;
  if (isRun(btn)) waitAndRecord('실행');
  else if (isSubmit(btn)) waitAndRecord('제출');
}, true);

function waitAndRecord(kind) {
  const doneWord = kind === '실행' ? '테스트 결과' : '채점 결과';
  let last = '';
  let ticks = 0;
  const timer = setInterval(() => {
    const text = document.querySelector('#output')?.innerText.trim() ?? '';
    // 결과 키워드가 나오고, 0.5초 동안 내용이 더 안 바뀌면 끝난 걸로 본다
    if (text.includes(doneWord) && text === last) {
      clearInterval(timer);
      record(kind, text);
    } else if (++ticks > 120) { // 60초
      clearInterval(timer);
      record(kind, text || '(결과를 읽지 못함)');
    }
    last = text;
  }, 500);
}

// 문제 번호/레벨/제목. 풀이 페이지엔 레벨 정보가 없을 수 있어서 문제 페이지에서 본 걸 저장해 둔다
const problemId = location.pathname.match(/lessons\/(\d+)/)[1];
function pageMeta() {
  const lesson = document.querySelector('.lesson-content')?.dataset ?? {};
  return {
    id: problemId,
    level: lesson.challengeLevel,
    title: lesson.lessonTitle || document.querySelector('.challenge-title')?.textContent.trim(),
    url: `${location.origin}/learn/courses/30/lessons/${problemId}`,
    language: new URLSearchParams(location.search).get('language') || document.querySelector('[data-language]')?.getAttribute('data-language') || 'python3',
  };
}
async function problemMeta() {
  const now = pageMeta();
  const key = `meta-${problemId}`;
  if (now.level && now.title) {
    chrome.storage.local.set({ [key]: { level: now.level, title: now.title } });
    return now;
  }
  const saved = (await chrome.storage.local.get(key))[key] ?? {};
  return { ...now, level: now.level ?? saved.level, title: now.title || saved.title || `문제${problemId}` };
}
problemMeta(); // 문제 페이지를 열 때 저장해 두기

async function record(kind, output) {
  const attempt = {
    ...(await problemMeta()),
    kind,
    code: document.querySelector('textarea#code')?.value ?? '',
    output,
    passed: isPassed(output),
    at: new Date().toISOString(),
  };
  // 맞은 실행은 어차피 제출 때 같은 코드가 올라가니 건너뜀
  if (kind === '실행' && attempt.passed) toast('✅ 실행 성공 — 기록은 제출할 때 남겨요');
  else if (kind === '제출' && attempt.passed) showMemo(attempt);
  else send(attempt);
}

async function send(attempt) {
  toast(`⏳ GitHub에 기록 중… (${attempt.kind})`);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'attempt', attempt });
    toast(res?.ok ? `✅ GitHub에 기록됨 (${attempt.kind === '참고' ? '참고 풀이' : `${attempt.kind} ${attempt.passed ? '성공' : '실패'}`})` : `❌ 기록 실패: ${res?.error}`, !res?.ok);
  } catch {
    toast('❌ 확장이 새로고침됐어요. 이 페이지를 새로고침(F5)한 뒤 다시 해 주세요.', true);
  }
}

function toast(text, isError = false) {
  let el = document.getElementById('pal-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pal-toast';
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;max-width:420px;padding:10px 14px;border-radius:8px;color:#fff;font:14px sans-serif;box-shadow:0 4px 12px #0004;white-space:pre-wrap';
    document.body.append(el);
  }
  el.textContent = text;
  el.style.background = isError ? '#d93025' : '#333';
  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.remove(), isError ? 15000 : 4000);
}

const MEMO_TEXT = {
  submit: {
    title: '🎉 정답! 복습 메모 남기기',
    memo: '메모 — 핵심 아이디어, 헷갈렸던 부분, 다음에 주의할 점',
    placeholder: '예) 360 넘는 경우를 생각 못 해서 처음에 틀림 → % 360',
    skip: '메모 없이 올리기',
    ok: '메모와 함께 올리기',
  },
  ref: {
    title: '💡 다른 사람 풀이 담기',
    memo: '메모 — 이렇게도 풀 수 있구나! 어떤 아이디어가 좋았는지',
    placeholder: '예) 정렬해서 짝 맞추는 대신 Counter 끼리 빼기로 한 줄 해결',
    skip: '취소',
    ok: '내 기록에 담기',
  },
};

function showMemo(attempt) {
  const t = attempt.kind === '참고' ? MEMO_TEXT.ref : MEMO_TEXT.submit;
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' }); // 페이지 CSS와 섞이지 않게
  root.innerHTML = `
    <style>
      .bg { position: fixed; inset: 0; background: #0008; z-index: 2147483647; display: grid; place-items: center; font-family: sans-serif; }
      .box { background: #fff; color: #222; width: min(760px, 92vw); max-height: 90vh; overflow: auto; border-radius: 12px; padding: 20px; display: grid; gap: 10px; }
      h2 { margin: 0; font-size: 18px; }
      label { font-size: 13px; color: #555; }
      textarea { width: 100%; box-sizing: border-box; border: 1px solid #ccc; border-radius: 8px; padding: 10px; font-size: 14px; }
      .code { font-family: Consolas, monospace; height: 260px; background: #f7f7f9; }
      .memo { height: 110px; }
      .row { display: flex; gap: 8px; justify-content: flex-end; }
      button { border: 0; border-radius: 8px; padding: 9px 16px; font-size: 14px; cursor: pointer; }
      .ok { background: #2f6fed; color: #fff; }
      .skip { background: #eee; color: #333; }
    </style>
    <div class="bg"><div class="box">
      <h2>${t.title}</h2>
      <label>코드 — 줄마다 # 주석으로 메모해도 됨 (고친 그대로 기록돼요)</label>
      <textarea class="code" spellcheck="false"></textarea>
      <label>${t.memo}</label>
      <textarea class="memo" placeholder="${t.placeholder}"></textarea>
      <div class="row"><button class="skip">${t.skip}</button><button class="ok">${t.ok}</button></div>
    </div></div>`;
  const code = root.querySelector('.code');
  const memo = root.querySelector('.memo');
  code.value = attempt.code;
  // 입력이 프로그래머스 에디터 단축키로 새지 않게
  root.querySelector('.bg').addEventListener('keydown', (e) => e.stopPropagation());
  // 채점 결과 팝업(Bootstrap)이 포커스를 뺏어가서 메모칸이 안 눌림 → window 단계에서 먼저 막는다
  const guard = (e) => { if (e.target === host) e.stopImmediatePropagation(); };
  window.addEventListener('focus', guard, true);
  window.addEventListener('focusin', guard, true);
  const done = (withMemo) => {
    window.removeEventListener('focus', guard, true);
    window.removeEventListener('focusin', guard, true);
    host.remove();
    if (!withMemo && attempt.kind === '참고') return; // 참고 풀이에서 '취소'
    send({ ...attempt, code: withMemo ? code.value : attempt.code, memo: withMemo ? memo.value : '' });
  };
  root.querySelector('.ok').onclick = () => done(true);
  root.querySelector('.skip').onclick = () => done(false);
  document.body.append(host);
  memo.focus();
}

// 풀이 코드 블록에서 코드만 꺼내기 (줄 번호·우리 버튼 빼고)
function codeOf(pre) {
  const c = pre.cloneNode(true);
  c.querySelectorAll('button, [class*="line-num"], [class*="linenum"], [class*="ln-num"], [class*="gutter"]').forEach((e) => e.remove());
  // 줄 번호 칸 옆에 코드가 안쪽 pre 로 들어있는 구조면 그 안쪽만 (여러 개면 줄마다 pre)
  const inner = c.querySelectorAll('pre');
  const text = inner.length === 0 ? c.textContent : [...inner].map((p) => p.textContent).join(inner.length > 1 ? '\n' : '');
  return stripLineNumbers(text);
}

// 맨 앞이 "1", "2", … 처럼 줄 번호만 있는 줄이면 떼어낸다
function stripLineNumbers(text) {
  const lines = text.replace(/^\n+/, '').split('\n');
  let k = 0;
  while (k < lines.length && lines[k].trim() === String(k + 1)) k++;
  return (k > 0 && k < lines.length ? lines.slice(k) : lines).join('\n').trim();
}

// 다른 사람의 풀이 페이지: 코드 블록마다 '내 기록에 담기' 버튼
if (/\/solution_groups/.test(location.pathname)) {
  const addButtons = () => document.querySelectorAll('pre').forEach((pre) => {
    if (pre.dataset.palDone || pre.innerText.trim().length < 10) return; // 빈/아주 짧은 블록은 코드 아님
    if (pre.closest('.CodeMirror, #output, .console-content, .guide-section-description')) return; // 에디터 줄, 결과창, 문제 설명
    if (pre.parentElement?.closest('pre')) return; // pre 안의 pre → 바깥 것 하나에만
    pre.dataset.palDone = '1';
    const b = document.createElement('button');
    b.type = 'button'; // form 안에 있어도 제출되지 않게
    b.textContent = '💡 내 기록에 담기';
    b.style.cssText = 'margin:6px 0;padding:5px 12px;border:0;border-radius:6px;background:#2f6fed;color:#fff;font-size:13px;cursor:pointer';
    b.onclick = async () => showMemo({ ...(await problemMeta()), kind: '참고', code: codeOf(pre), output: '', passed: true, source: location.href, at: new Date().toISOString() });
    pre.before(b);
  });
  addButtons();
  // 다음 페이지/더보기로 풀이가 새로 그려질 때도 붙이기
  new MutationObserver(addButtons).observe(document.body, { childList: true, subtree: true });
}
