// GitHub Auto Chinese
// 自动翻译 GitHub 基础界面文字

(function () {
  "use strict";

  // 不翻译的区域
  const ignoredTags = [
    "SCRIPT",
    "STYLE",
    "CODE",
    "PRE",
    "TEXTAREA",
    "INPUT"
  ];

  // 判断文字是否应该跳过
  function shouldIgnore(node) {
    const parent = node.parentElement;

    if (!parent) {
      return true;
    }

    // 跳过代码和输入区域
    if (ignoredTags.includes(parent.tagName)) {
      return true;
    }

    // 跳过 GitHub 代码区域
    if (
      parent.closest(
        ".blob-code, .highlight, .js-file-line-container, pre, code"
      )
    ) {
      return true;
    }

    return false;
  }

  // 翻译单个文本节点
  function translateTextNode(node) {
    if (shouldIgnore(node)) {
      return;
    }

    const text = node.nodeValue;

    if (!text) {
      return;
    }

    const trimmedText = text.trim();

    // 必须完全匹配词典
    if (
      trimmedText &&
      typeof GITHUB_CHINESE_DICTIONARY !== "undefined" &&
      GITHUB_CHINESE_DICTIONARY[trimmedText]
    ) {
      const translated =
        GITHUB_CHINESE_DICTIONARY[trimmedText];

      // 保留原来的空格格式
      node.nodeValue = text.replace(
        trimmedText,
        translated
      );
    }
  }

  // 翻译页面
  function translatePage(root = document.body) {
    if (!root) {
      return;
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(translateTextNode);
  }

  // 初次翻译
  translatePage();

  // 监听页面变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {

        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node);
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          translatePage(node);
        }

      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
