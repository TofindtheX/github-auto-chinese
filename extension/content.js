// GitHub Auto Chinese
// Local Qwen3.5:4B intelligent page translator

(function () {
  "use strict";

  const TRANSLATED_ATTR = "data-github-auto-chinese";
  const TRANSLATING_ATTR = "data-github-auto-chinese-translating";

  // 每批最多发送多少个文本节点
  const BATCH_SIZE = 8;

  // 单个文本最大长度
  const MAX_TEXT_LENGTH = 800;

  // 不处理的 HTML 标签
  const IGNORED_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE",
    "SVG",
    "CANVAS"
  ]);

  // GitHub 中明确不应该翻译的区域
  const IGNORED_SELECTORS = [
    "pre",
    "code",
    ".blob-code",
    ".highlight",
    ".js-file-line-container",
    "[contenteditable='true']",
    "[data-testid='file-content'] .react-code-text"
  ];

  // 常见技术名称
  const protectedTerms = [
    "GitHub",
    "GitHub Copilot",
    "Git",
    "OpenAI",
    "GPT",
    "GPT-5",
    "GPT-5.6",
    "Claude",
    "Gemini",
    "Qwen",
    "Qwen3",
    "Qwen3.5",
    "Llama",
    "DeepSeek",
    "Mistral",
    "Phi",
    "Gemma",
    "React",
    "Vue",
    "Angular",
    "Svelte",
    "JavaScript",
    "TypeScript",
    "Python",
    "Node.js",
    "Node",
    "Docker",
    "Kubernetes",
    "Markdown",
    "HTML",
    "CSS",
    "JSON",
    "XML",
    "REST",
    "GraphQL",
    "API",
    "API URL",
    "Ollama",
    "VS Code",
    "Visual Studio Code",
    "Microsoft",
    "Windows",
    "Linux",
    "macOS",
    "Ubuntu",
    "npm",
    "pnpm",
    "yarn",
    "Bun",
    "Vite",
    "Next.js",
    "Nuxt",
    "Django",
    "Flask",
    "FastAPI",
    "Rust",
    "Go",
    "Java",
    "C++",
    "C#",
    "PHP",
    "Ruby",
    "Swift",
    "Kotlin",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "Redis",
    "MongoDB",
    "Firebase",
    "Supabase",
    "TensorFlow",
    "PyTorch"
  ];

  // 判断元素是否在不应该翻译的区域
  function isIgnoredElement(element) {
    if (!element) {
      return true;
    }

    if (IGNORED_TAGS.has(element.tagName)) {
      return true;
    }

    for (const selector of IGNORED_SELECTORS) {
      if (element.matches?.(selector)) {
        return true;
      }

      if (element.closest?.(selector)) {
        return true;
      }
    }

    if (
      element.closest?.(
        `[${TRANSLATED_ATTR}], [${TRANSLATING_ATTR}]`
      )
    ) {
      return true;
    }

    return false;
  }

  // 判断文本是否值得翻译
  function shouldTranslateText(text) {
    if (!text) {
      return false;
    }

    const trimmed = text.trim();

    if (!trimmed) {
      return false;
    }

    // 太长的文本暂时跳过
    if (trimmed.length > MAX_TEXT_LENGTH) {
      return false;
    }

    // 没有英文
    if (!/[A-Za-z]/.test(trimmed)) {
      return false;
    }

    // URL
    if (/^https?:\/\//i.test(trimmed)) {
      return false;
    }

    // 纯代码风格
    if (
      /^[\w./\\:@#$%&*+=<>()[\]{}'"`~-]+$/.test(trimmed)
    ) {
      return false;
    }

    // 纯命令行
    if (
      /^(npm|pnpm|yarn|git|python|pip|node|docker|ollama)\s+/i.test(
        trimmed
      )
    ) {
      return false;
    }

    // 文件名
    if (
      /^[\w.-]+\.(md|js|ts|tsx|jsx|json|yml|yaml|py|css|html|xml|sh|bat|ps1|go|rs|java|c|cpp|h|lock|toml|ini)$/i.test(
        trimmed
      )
    ) {
      return false;
    }

    return true;
  }

  // 判断文本节点
  function shouldIgnoreNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      return true;
    }

    const parent = node.parentElement;

    if (!parent) {
      return true;
    }

    if (isIgnoredElement(parent)) {
      return true;
    }

    if (!shouldTranslateText(node.nodeValue)) {
      return true;
    }

    return false;
  }

  // 保护技术内容
  function protectText(text) {
    const protectedItems = [];
    let result = text;

    function protect(pattern) {
      result = result.replace(pattern, function (match) {
        const index = protectedItems.length;

        protectedItems.push(match);

        return `⟦KEEP_${index}⟧`;
      });
    }

    // URL
    protect(/https?:\/\/[^\s]+/gi);

    // Markdown 代码
    protect(/`[^`\n]+`/g);

    // 文件名
    protect(
      /\b[\w.-]+\.(?:md|js|ts|tsx|jsx|json|yml|yaml|py|css|html|xml|sh|bat|ps1|go|rs|java|c|cpp|h|lock|toml|ini|env|sql)\b/gi
    );

    // 命令参数
    protect(/--[a-zA-Z0-9_-]+/g);

    // API 路径
    protect(/\/api\/[A-Za-z0-9_./:-]+/g);

    // GitHub owner/repository
    protect(
      /\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/g
    );

    // Git commit hash
    protect(/\b[a-f0-9]{7,40}\b/gi);

    // 版本号
    protect(
      /\bv?\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/gi
    );

    // Issue / PR 编号
    protect(/(?:#|issue\s+|PR\s+)\d+\b/gi);

    // 模型名称
    protect(
      /\b(?:GPT|Qwen|Claude|Gemini|Llama|DeepSeek|Mistral|Phi|Gemma)[\w.:/-]*/gi
    );

    // 已知技术名称
    for (const term of protectedTerms) {
      const escaped = term.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        `\\b${escaped}\\b`,
        "gi"
      );

      protect(regex);
    }

    return {
      text: result,
      protectedItems
    };
  }

  // 恢复技术内容
  function restoreText(text, protectedItems) {
    let result = text;

    protectedItems.forEach(function (item, index) {
      const placeholder = `⟦KEEP_${index}⟧`;

      result = result
        .split(placeholder)
        .join(item);
    });

    return result;
  }

  // 请求 Qwen
  function translateWithQwen(text) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        {
          type: "translate",
          text: text
        },
        function (response) {
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                chrome.runtime.lastError.message
              )
            );

            return;
          }

          if (!response || !response.ok) {
            reject(
              new Error(
                response?.error || "翻译失败"
              )
            );

            return;
          }

          resolve(response.text || "");
        }
      );
    });
  }

  // 翻译单个文本节点
  async function translateNode(node) {
    if (shouldIgnoreNode(node)) {
      return;
    }

    const parent = node.parentElement;

    if (!parent) {
      return;
    }

    const original = node.nodeValue;

    if (!original) {
      return;
    }

    const leading =
      original.match(/^\s*/)?.[0] || "";

    const trailing =
      original.match(/\s*$/)?.[0] || "";

    const trimmed = original.trim();

    const protectedData = protectText(trimmed);

    // 保护后已经没有需要翻译的英文
    if (!/[A-Za-z]/.test(protectedData.text)) {
      return;
    }

    // 标记正在翻译
    parent.setAttribute(
      TRANSLATING_ATTR,
      "true"
    );

    try {
      const translated =
        await translateWithQwen(
          protectedData.text
        );

      if (!translated) {
        return;
      }

      const restored =
        restoreText(
          translated.trim(),
          protectedData.protectedItems
        );

      if (!restored || restored === trimmed) {
        return;
      }

      node.nodeValue =
        leading +
        restored +
        trailing;

      parent.setAttribute(
        TRANSLATED_ATTR,
        "true"
      );

    } catch (error) {
      console.warn(
        "GitHub Auto Chinese translation error:",
        error
      );

    } finally {
      parent.removeAttribute(
        TRANSLATING_ATTR
      );
    }
  }

  // 收集文本节点
  function collectTextNodes(root) {
    const nodes = [];

    if (!root) {
      return nodes;
    }

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
      );

    let node;

    while (
      (node = walker.nextNode())
    ) {
      if (!shouldIgnoreNode(node)) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  // 分批翻译
  async function translatePage(root) {
    if (!root) {
      return;
    }

    const nodes =
      collectTextNodes(root);

    if (!nodes.length) {
      return;
    }

    console.log(
      `GitHub Auto Chinese: found ${nodes.length} text nodes`
    );

    for (
      let i = 0;
      i < nodes.length;
      i += BATCH_SIZE
    ) {
      const batch =
        nodes.slice(
          i,
          i + BATCH_SIZE
        );

      await Promise.all(
        batch.map(function (node) {
          return translateNode(node);
        })
      );

      // 给浏览器一点喘息时间
      await new Promise(
        function (resolve) {
          setTimeout(resolve, 100);
        }
      );
    }

    console.log(
      "GitHub Auto Chinese: translation batch finished."
    );
  }

  // 防抖
  let observerTimer = null;

  function scheduleTranslation(root) {
    clearTimeout(observerTimer);

    observerTimer = setTimeout(
      function () {
        translatePage(root);
      },
      800
    );
  }

  // 监听 GitHub 动态页面
  function startObserver() {
    const observer =
      new MutationObserver(
        function (mutations) {
          const elements = [];

          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (
                node.nodeType ===
                Node.ELEMENT_NODE
              ) {
                elements.push(node);
              }
            }
          }

          if (elements.length) {
            scheduleTranslation(
              document.body
            );
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  // 启动
  async function start() {
    console.log(
      "GitHub Auto Chinese: Local Qwen translator starting..."
    );

    await translatePage(
      document.body
    );

    startObserver();

    console.log(
      "GitHub Auto Chinese: Local Qwen translator started."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})();
