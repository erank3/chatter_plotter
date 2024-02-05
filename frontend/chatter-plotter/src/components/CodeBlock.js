import React, { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import plaintext from "highlight.js/lib/languages/plaintext";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/vs2015.css";

hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("json", json);

const CodeBlock = ({ code }) => {
  const codeRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let highlightedCode;

    // Try to highlight the code using the "javascript" or "json" language
    const highlightedJavaScript = hljs.highlight(code, {
      language: "plaintext",
    });
    const highlightedJson = hljs.highlight(code, { language: "json" });

    if (highlightedJavaScript.relevance > 0) {
      highlightedCode = highlightedJavaScript.value;
    } else if (highlightedJson.relevance > 0) {
      highlightedCode = highlightedJson.value;
    } else {
      // If no supported language is detected, fallback to JSON
      highlightedCode = hljs.highlight(code, { language: "json" }).value;
    }

    codeRef.current.innerHTML = highlightedCode;

    // Auto scroll to the bottom
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [code]);

  return (
    <div ref={containerRef} style={{ overflowY: "auto", maxHeight: "350px" }}>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        <code ref={codeRef} className="language-json" />
      </pre>
    </div>
  );
};

export default CodeBlock;
