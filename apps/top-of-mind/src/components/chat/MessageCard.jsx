import React, { useState } from "react";
import { Copy, Check, Sparkles, Terminal, ArrowUpRight, Share2, ThumbsUp } from "lucide-react";
import { SourceAvatar } from "../icons/AppIcons";

export function MessageCard({ message, onCopy, onSendToNote }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const text = message.content || message.body || "";

  function handleCopy() {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  // Parse fenced code blocks ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <article className={`message-card ${isUser ? "user" : ""}`}>
      <div className="message-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isUser && <SourceAvatar source={message.source || "AI"} compact />}
          <span className="message-card-author">
            {isUser ? "You" : message.source || "Assistant"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "11px", color: "var(--tom-text-dim)" }}>
            {message.created_at || ""}
          </span>
          <button
            className="action-pill-btn"
            style={{ padding: "2px 5px", fontSize: "10px" }}
            title="Copy message text"
            onClick={handleCopy}
          >
            {copied ? (
              <Check size={10} style={{ color: "var(--tom-green)" }} />
            ) : (
              <Copy size={10} />
            )}
          </button>
        </div>
      </div>

      <div className="message-body">
        {parts.map((part, idx) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const lines = part.slice(3, -3).trim().split("\n");
            const lang = lines[0] && !lines[0].includes(" ") ? lines[0] : "";
            const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
            return (
              <div key={idx} className="code-block-container">
                <div className="code-block-header">
                  <span>{lang || "code"}</span>
                  <button
                    className="action-pill-btn"
                    style={{ padding: "2px 5px", fontSize: "10px" }}
                    onClick={() => navigator.clipboard?.writeText(code)}
                  >
                    <Copy size={10} />
                  </button>
                </div>
                <pre className="code-pre">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }
          return (
            <p key={idx} style={{ margin: "4px 0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {part}
            </p>
          );
        })}
      </div>
    </article>
  );
}
