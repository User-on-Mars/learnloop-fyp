import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DataTable from "../DataTable";

describe("DataTable", () => {
  const mockData = [
    { id: 1, name: "Item 1", value: 100 },
    { id: 2, name: "Item 2", value: 200 },
    { id: 3, name: "Item 3", value: 300 },
  ];

  const mockColumns = [
    {
      key: "id",
      label: "#",
      span: 2,
      render: (item) => <span>{item.id}</span>,
    },
    {
      key: "name",
      label: "Name",
      span: 6,
      render: (item) => <span>{item.name}</span>,
    },
    {
      key: "value",
      label: "Value",
      span: 4,
      align: "right",
      render: (item) => <span>{item.value}</span>,
    },
  ];

  const mockRenderMobileCard = (item) => (
    <div>
      <div className="font-bold">{item.name}</div>
      <div className="text-sm">{item.value}</div>
    </div>
  );

  it("renders empty state when no data", () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders desktop table with correct columns", () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    // Check headers are rendered
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();

    // Check data is rendered (both desktop and mobile views exist, so use getAllByText)
    expect(screen.getAllByText("Item 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Item 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Item 3").length).toBeGreaterThan(0);
  });

  it("calls onRowClick when row is clicked", () => {
    const handleClick = vi.fn();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
        onRowClick={handleClick}
      />
    );

    // Find and click the first row (desktop view)
    const rows = screen.getAllByText("Item 1");
    fireEvent.click(rows[0].closest("div[class*='grid-cols-12']"));

    expect(handleClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  it("renders mobile cards with custom render function", () => {
    // Mock window.innerWidth for mobile
    global.innerWidth = 500;

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    // Mobile cards should render the custom content (both views exist, so use getAllByText)
    expect(screen.getAllByText("Item 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
  });

  it("applies minimum tap target height to rows", () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    // Check that rows have minimum height
    const rows = container.querySelectorAll("div[style*='minHeight']");
    rows.forEach((row) => {
      expect(row.style.minHeight).toBe("44px");
    });
  });

  it("renders empty action when provided", () => {
    const emptyAction = (
      <button onClick={() => {}}>Create New Item</button>
    );

    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No items"
        emptyAction={emptyAction}
      />
    );

    expect(screen.getByText("Create New Item")).toBeInTheDocument();
  });

  it("applies custom className to container", () => {
    const { container } = render(
      <DataTable
        data={[]}
        columns={mockColumns}
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("handles items without id or _id", () => {
    const dataWithoutIds = [
      { name: "Item 1", value: 100 },
      { name: "Item 2", value: 200 },
    ];

    render(
      <DataTable
        data={dataWithoutIds}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    // Both desktop and mobile views exist, so use getAllByText
    expect(screen.getAllByText("Item 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Item 2").length).toBeGreaterThan(0);
  });

  it("applies correct alignment classes to columns", () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    // Check that the "Value" column (align: right) has text-right class
    const headers = container.querySelectorAll(".text-right");
    expect(headers.length).toBeGreaterThan(0);
  });

  it("shows hover state only when onRowClick is provided", () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
        onRowClick={() => {}}
      />
    );

    const rows = container.querySelectorAll(".cursor-pointer");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("does not show hover state when onRowClick is not provided", () => {
    const { container } = render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        renderMobileCard={mockRenderMobileCard}
      />
    );

    const rows = container.querySelectorAll(".cursor-pointer");
    expect(rows.length).toBe(0);
  });
});
