import { memo, useMemo } from "react";

/**
 * DataTable - Responsive table component with mobile card fallback
 * 
 * Desktop: Grid-based table layout with customizable columns
 * Mobile: Card-based layout with custom rendering
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.columns - Column configuration for desktop table
 *   Each column: { key, label, span, align?, render? }
 * @param {Function} props.renderMobileCard - Function to render mobile card for each item
 * @param {Function} props.onRowClick - Optional click handler for rows/cards
 * @param {number|null} props.expandedIndex - Index of the currently expanded row (null = none)
 * @param {Function} props.renderExpand - Function(item, index) that returns the expand panel JSX
 * @param {string} props.emptyMessage - Message to show when no data
 * @param {React.ReactNode} props.emptyIcon - Icon to show when no data
 * @param {React.ReactNode} props.emptyAction - Action button/link for empty state
 * @param {string} props.className - Additional classes for container
 */
const DataTable = memo(function DataTable({
  data = [],
  columns = [],
  renderMobileCard,
  onRowClick,
  expandedIndex = null,
  renderExpand,
  emptyMessage = "No data available",
  emptyIcon = null,
  emptyAction = null,
  className = "",
}) {
  // Compute total spans to use as grid template
  const totalSpans = useMemo(
    () => columns.reduce((sum, col) => sum + (col.span || 1), 0),
    [columns]
  );

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`text-center py-10 ${className}`}>
        {emptyIcon && <div className="mx-auto mb-2">{emptyIcon}</div>}
        <p className="text-sm text-[#9aa094]">{emptyMessage}</p>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        {/* Table Header */}
        <div
          className="grid gap-3 px-3 pt-4 pb-2 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider"
          style={{ gridTemplateColumns: `repeat(${totalSpans}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <span
              key={col.key}
              style={{ gridColumn: `span ${col.span || 1}` }}
              className={
                col.align === "center"
                  ? "text-center"
                  : col.align === "right"
                  ? "text-right"
                  : ""
              }
            >
              {col.label}
            </span>
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[#f0f2eb]">
          {data.map((item, index) => {
            const isActive = expandedIndex === index;
            return (
              <div key={item.id || item._id || index}>
                {/* Row */}
                <div
                  onClick={() => onRowClick?.(item, index)}
                  className={`grid gap-3 items-center px-3 py-3 transition-colors ${
                    onRowClick ? "cursor-pointer group" : ""
                  } ${isActive ? "bg-[#f0f5ed]" : onRowClick ? "hover:bg-[#f8faf6]" : ""}`}
                  style={{
                    gridTemplateColumns: `repeat(${totalSpans}, minmax(0, 1fr))`,
                    minHeight: "44px",
                  }}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      style={{ gridColumn: `span ${col.span || 1}` }}
                      className={`${
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                          ? "text-right"
                          : ""
                      } ${col.className || ""}`}
                    >
                      {col.render ? col.render(item, index) : item[col.key]}
                    </div>
                  ))}
                </div>
                {/* Inline Expand Panel */}
                {isActive && renderExpand && (
                  <div className="bg-[#f8faf6] border-t border-[#e2e6dc] px-5 py-4">
                    {renderExpand(item, index)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {data.map((item, index) => {
          const isActive = expandedIndex === index;
          return (
            <div
              key={item.id || item._id || index}
              className={`bg-white rounded-xl border overflow-hidden transition-colors ${
                isActive ? "border-[#c8dbbe]" : "border-[#e2e6dc]"
              }`}
            >
              <div
                onClick={() => onRowClick?.(item, index)}
                className={`p-4 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${isActive ? "bg-[#f0f5ed]" : onRowClick ? "active:bg-[#f8faf6]" : ""}`}
                style={{ minHeight: "44px" }}
              >
                {renderMobileCard ? renderMobileCard(item, index) : (
                  <div className="text-sm text-[#565c52]">
                    {JSON.stringify(item)}
                  </div>
                )}
              </div>
              {/* Inline Expand Panel (Mobile) */}
              {isActive && renderExpand && (
                <div className="bg-[#f8faf6] border-t border-[#e2e6dc] px-4 py-3">
                  {renderExpand(item, index)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
});

export default DataTable;
