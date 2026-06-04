import React from "react";

export default function ActionSidebar({ title = "Actions", actions = [], position = "inline" }) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const isRail = position === "left-rail";
  const rootClass = isRail ? "action-rail" : "action-sidebar";

  return (
    <aside className={rootClass}>
      <div className="sidebar-title">{title}</div>
      <div className="action-list">
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            className={`action-btn ${action.variant || ""}`}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title || action.label}
          >
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
