chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "translate") {
    return;
  }

  (async () => {
    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen3.5:4b",
          stream: false,
          keep_alive: "10m",
          messages: [
            {
              role: "system",
              content: `
你是 GitHub 页面本地化翻译器。

任务：
把用户提供的英文普通界面文字或功能说明翻译成自然、简洁的简体中文。

必须遵守以下规则：

1. 只返回最终译文。
2. 不要解释翻译过程。
3. 不要输出 Thinking Process。
4. 不要添加引号。
5. 技术名词尽量保持原样。
6. 必须保持以下内容原样：
   - 模型名称
   - 软件名称
   - 技术名称
   - 编程语言名称
   - 文件名
   - 文件扩展名
   - 代码
   - 命令
   - URL
   - 用户名
   - 仓库名
   - 版本号
   - API 路径
   - 参数名
   - 变量名
   - GitHub 专有名称
7. 不要翻译代码、命令、文件名和 URL。
8. 如果输入本身已经是中文，则原样返回。
9. 保持原文的大致语气和格式。
`
            },
            {
              role: "user",
              content: String(msg.text || "")
            }
          ]
        })
      });

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${raw}`);
      }

      const data = JSON.parse(raw);

      const translated =
        data?.message?.content ??
        data?.response ??
        "";

      if (!translated) {
        throw new Error("Ollama 没有返回翻译内容");
      }

      sendResponse({
        ok: true,
        text: translated.trim()
      });

    } catch (error) {
      console.error("GitHub Auto Chinese:", error);

      sendResponse({
        ok: false,
        error: String(error)
      });
    }
  })();

  return true;
});
