const ids = ['token', 'repo', 'branch'];
chrome.storage.sync.get(ids, (v) => ids.forEach((k) => (document.getElementById(k).value = v[k] || '')));
document.getElementById('save').onclick = async () => {
  const v = Object.fromEntries(ids.map((k) => [k, document.getElementById(k).value.trim()]));
  if (!v.branch) v.branch = 'main';
  if (!v.token.startsWith('github_pat_') && !v.token.startsWith('ghp_')) {
    document.getElementById('msg').textContent = '❌ 토큰은 github_pat_ 로 시작해야 해요';
    return;
  }
  await chrome.storage.sync.set(v);
  document.getElementById('msg').textContent = '저장됨';
};
