// GitHub Auto Chinese
// Local Qwen3.5:4B translator

(function () {
  "use strict";

  const TRANSLATED_ATTR = "data-github-auto-chinese";
  const MAX_TEXT_LENGTH = 500;

  // 不处理的 HTML 标签
  const ignoredTags = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE",
    "SVG"
  ]);

  // 已知需要保持原样的技术名称
  const protectedTerms = [
    "GitHub",
    "Git",
    "GitHub Copilot",
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
    "React",
    "Vue",
    "Angular",
    "JavaScript",
    "TypeScript",
    "Python",
    "Node.js",
    "Docker",
    "Kubernetes",
    "Markdown",
    "HTML",
    "CSS",
    "JSON",
    "REST",
    "GraphQL",
    "API",
    "Ollama",
    "VS Code",
    "Microsoft",
    "Windows",
    "Linux",
    "macOS"
  ];

  // 判断文本节点是否应该跳过
  function shouldIgnoreNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      return true;
    }

    const parent = node.parentElement;

    if (!parent) {
      return true;
    }

    if (ignoredTags.has(parent.tagName)) {
      return true;
    }

    // GitHub 代码区域
    if (
      parent.closest(
        ".blob-code, .highlight, .js-file-line-container, pre, code"
      )
    ) {
      return true;
    }

    // 已经翻译过
    if (parent.closest(`[${TRANSLATED_ATTR}]`)) {
      return true;
    }

    const text = node.nodeValue;

    if (!text || !text.trim()) {
      return true;
    }

    const trimmed = text.trim();

    // 太长的内容暂时跳过
    if (trimmed.length > MAX_TEXT_LENGTH) {
      return true;
    }

    // 纯数字、符号、空白
    if (!/[A-Za-z]/.test(trimmed)) {
      return true;
    }

    // URL
    if (/^https?:\/\//i.test(trimmed)) {
      return true;
    }

    return false;
  }

  // 保护技术名、文件名、URL、命令等
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

    // Markdown / 代码反引号
    protect(/`[^`]+`/g);

    // 文件名
    protect(
      /\b[\w.-]+\.(?:md|js|ts|tsx|jsx|json|yml|yaml|py|css|html|xml|sh|bat|ps1|go|rs|java|c|cpp|h|lock|toml|ini)\b/gi
    );

    // 命令行参数
    protect(/--[a-zA-Z0-9_-]+/g);

    // API 路径
    protect(/\/api\/[A-Za-z0-9_./:-]+/g);

    // Git commit hash
    protect(/\b[a-f0-9]{7,40}\b/gi);

    // 版本号
    protect(/\bv?\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/gi);

    // 已知技术名称
    protectedTerms.forEach(function (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(
        `\\b${escaped}\\b`,
        "gi"
      );

      protect(regex);
    });

    // 模型名称
    protect(
      /\b(?:GPT|Qwen|Claude|Gemini|Llama|DeepSeek|Mistral|Phi|Gemma)[\w.:/-]*/gi
    );

    return {
      text: result,
      protectedItems
    };
  }

  // 恢复被保护的内容
  function restoreText(text, protectedItems) {
    let result = text;

    protectedItems.forEach(function (item, index) {
      const placeholder = `⟦KEEP_${index}⟧`;

      result = result.split(placeholder).join(item);
    });

    return result;
  }

  // 向 background.js 请求 Qwen 翻译
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
              new Error(chrome.runtime.lastError.message)
            );

            return;
          }

          if (!response || !response.ok) {
            reject(
              new Error(
                response && response.error
                  ? response.error
                  : "翻译失败"
              )
            );

            return;
          }

          resolve(response.text);
        }
      );
    });
  }

  // 翻译单个文本节点
  async function translateTextNode(node) {
    if (shouldIgnoreNode(node)) {
      return;
    }

    const originalText = node.nodeValue;

    if (!originalText || !originalText.trim()) {
      return;
    }

    const trimmed = originalText.trim();

    // 防止重复处理
    if (
      node.parentElement &&
      node.parentElement.hasAttribute(TRANSLATED_ATTR)
    ) {
      return;
    }

    const protectedData = protectText(trimmed);

    // 如果没有真正需要翻译的英文，跳过
    if (!/[A-Za-z]/.test(protectedData.text)) {
      return;
    }

    try {
      const translated = await translateWithQwen(
        protectedData.text
      );

      if (!translated) {
        return;
      }

      const restored = restoreText(
        translated,
        protectedData.protectedItems
      );

      if (!restored || restored === trimmed) {
        return;
      }

      // 保留原文本前后的空格
      const leading =
        originalText.match(/^\s*/)?.[0] || "";

      const trailing =
        originalText.match(/\s*$/)?.[0] || "";

      node.nodeValue =
        leading +
        restored +
        trailing;

      if (node.parentElement) {
        node.parentElement.setAttribute(
          TRANSLATED_ATTR,
          "true"
        );
      }
    } catch (error) {
      console.warn(
        "GitHub Auto Chinese:",
        error
      );
    }
  }

  // 找到页面上的文本节点
  function collectTextNodes(root) {
    const nodes = [];

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    let current;

    while ((current = walker.nextNode())) {
      if (!shouldIgnoreNode(current)) {
        nodes.push(current);
      }
    }

    return nodes;
  }

  // 翻译页面
  async function translatePage(root = document.body) {
    if (!root) {
      return;
    }

    const nodes = collectTextNodes(root);

    // 一次处理一个，避免 Ollama 同时收到大量请求
    for (const node of nodes) {
      await translateTextNode(node);
    }
  }

  // GitHub 是动态页面，所以监听页面变化
  let timer = null;

  const observer = new MutationObserver(
    function (mutations) {
      clearTimeout(timer);

      timer = setTimeout(function () {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translatePage(node);
            }

            if (node.nodeType === Node.TEXT_NODE) {
              translateTextNode(node);
            }
          }
        }
      }, 1200);
    }
  );

  // 启动
  function start() {
    translatePage();

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log(
      "GitHub Auto Chinese: Local Qwen translator started."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start
    );
  } else {
    start();
  }
})();
