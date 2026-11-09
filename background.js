importScripts('format.js');

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

// 같은 파일을 읽고-쓰기 하므로 업로드는 한 번에 하나씩
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'attempt') return;
  // 결과를 페이지에 알려줘야 하므로 true 를 돌려 응답 채널을 열어둔다
  queue = queue
    .then(() => upload(msg.attempt))
    .then(() => sendResponse({ ok: true }), (e) => {
      console.error(e);
      sendResponse({ ok: false, error: e.message });
    });
  return true;
});

async function upload(a) {
  const { token, repo, branch = 'main' } = await chrome.storage.sync.get(['token', 'repo', 'branch']);
  if (!token || !repo) throw new Error('확장 설정에서 토큰/저장소를 입력하세요');

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  // 풀이 페이지 등에선 레벨/제목을 모를 수 있으니, 같은 문제 번호 파일이 이미 있으면 그 파일에 붙인다
  const path = (await findExisting(repo, branch, headers, a.id)) ?? problemPath(a);
  const url = `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

  // 방금 올린 직후엔 GitHub가 옛 sha를 줄 때가 있어서(409) 한 번 더 시도
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: 'no-store' });
    let text = fileHeader(a), sha;
    if (res.ok) {
      const json = await res.json();
      sha = json.sha;
      text = unb64(json.content);
    }
    text += a.kind === '참고' ? refSection(a) : attemptSection(a, nextAttemptNo(text));

    const put = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message: `[${a.id}] ${a.title} - ${a.kind === '참고' ? '참고 풀이' : `${a.kind} ${a.passed ? '성공' : '실패'}`}`, content: b64(text), branch, sha }),
    });
    if (put.ok) return;
    if (put.status === 401) throw new Error('토큰이 틀렸거나 취소됐어요. 아이콘을 눌러 설정에서 토큰을 다시 넣어 주세요.');
    if (put.status === 403 || put.status === 404) throw new Error(`저장소 이름이 틀렸거나 토큰에 이 저장소 쓰기 권한(Contents: Read and write)이 없어요. (${put.status})`);
    if (put.status !== 409 && put.status !== 422) throw new Error(`${path}: ${put.status} ${await put.text()}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`${path}: 3번 시도했지만 충돌로 실패`);
}

async function findExisting(repo, branch, headers, id) {
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers, cache: 'no-store' });
  if (!res.ok) return null;
  const re = new RegExp(`^programmers/[^/]+/${id}-[^/]*\\.md$`);
  const found = (await res.json()).tree.map((t) => t.path).filter((p) => re.test(p));
  return found.find((p) => !p.includes('/etc/')) ?? found[0] ?? null; // lv 폴더 우선
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (ch) => ch.charCodeAt(0)));
