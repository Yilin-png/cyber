/* 前端 API 封装 */
window.CC = window.CC || {};

function apiBaseHint() {
  if (location.protocol === "file:") {
    return "你正在用本地文件打开页面。请先运行 npm start，再访问 http://localhost:3000";
  }
  return "请确认已运行 npm start，并用 http://localhost:3000 打开（不要用其他端口的静态预览）";
}

CC.api = async function(path, opts = {}) {
  const { headers: extraHeaders, ...rest } = opts || {};
  let res;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(extraHeaders || {})
      }
    });
  } catch (e) {
    const err = new Error("无法连接服务器（Failed to fetch）。" + apiBaseHint());
    err.cause = e;
    err.status = 0;
    throw err;
  }

  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || ("请求失败 " + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

CC.authMe = () => CC.api("/api/auth/me");
CC.logout = () => CC.api("/api/auth/logout", { method: "POST", body: "{}" });
