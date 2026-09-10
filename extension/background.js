// GitHub Auto Chinese - Local Qwen Translator

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "translate") {
    return;
  }

  translateWithQwen(message.text)
    .then((text) => {
      sendResponse({
        ok: true,
        text: text
      });
    })
    .catch((error) => {
      console.error("Qwen translation error:", error);

      sendResponse({
        ok: false,
        error: error.message
      });
    });

  return true;
});

async function translateWithQwen(text) {
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
你是一个 GitHub 网页本地化翻译器。

任务：
把 GitHub 页面上的普通英文界面文字翻译成简体中文。

非常重要：

1. 只翻译普通自然语言。
2. 不要翻译模型名称。
3. 不要翻译技术名称。
4. 不要翻译文件名。
5. 不要翻译代码。
6. 不要翻译命令。
7. 不要翻译 URL。
8. 不要翻译用户名、仓库名。
9. 不要翻译 API 路径。
10. 不要翻译版本号。
11. 不要翻译变量名、函数名、参数名。
12. 保留所有占位符，例如 ⟦KEEP_0⟧、⟦KEEP_1⟧。
13. 只输出最终翻译结果。
14. 不要解释。
15. 不要分析。
16. 不要添加“翻译如下”等额外文字。

例如：

Input:
Create a new repository named ⟦KEEP_0⟧

Output:
创建一个名为 ⟦KEEP_0⟧ 的新仓库
`
        },

        {
          role: "user",
          content: text
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(
      "Ollama 请求失败，HTTP 状态码: " + response.status
    );
  }

  const data = await response.json();

  if (
    !data.message ||
    typeof data.message.content !== "string"
  ) {
    throw new Error("Ollama 没有返回有效的翻译结果");
  }

  return data.message.content.trim();
}
