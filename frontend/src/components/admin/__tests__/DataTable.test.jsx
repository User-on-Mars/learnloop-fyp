import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '../DataTable'

const sampleColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
]

const sampleData = [
  { name: 'Alice', email: 'alice@test.com', status: 'active' },
  { name: 'Bob', email: 'bob@test.com', status: 'banned' },
]

describe('DataTable', () => {
  it('renders loading skeleton when loading is true', () => {
    const { container } = render(
      <DataTable columns={sampleColumns} data={[]} loading={true} />
    )
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBe(5)
  })

  it('renders empty state when data is empty', () => {
    render(<DataTable columns={sampleColumns} data={[]} empty="No users found" />)
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('renders table with columns and data', () => {
    render(<DataTable columns={sampleColumns} data={sampleData} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('uses custom render function for columns', () => {
    const columnsWithRender = [
      { key: 'name', label: 'Name', render: (val) => <strong>{val}</strong> },
    ]
    render(<DataTable columns={columnsWithRender} data={sampleData} />)
    const strong = screen.getAllByText('Alice')[0].closest('strong')
    expect(strong).toBeInTheDocument()
  })

  describe('hideOnMobile', () => {
    it('applies hidden md:table-cell class to columns with hideOnMobile', () => {
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email', hideOnMobile: true },
      ]
      const { container } = render(<DataTable columns={columns} data={sampleData} />)

      // Check header
      const headers = container.querySelectorAll('th')
      expect(headers[0].className).not.toContain('hidden')
      expect(headers[1].className).toContain('hidden md:table-cell')

      // Check data cells
      const rows = container.querySelectorAll('tbody tr')
      const firstRowCells = rows[0].querySelectorAll('td')
      expect(firstRowCells[0].className).not.toContain('hidden')
      expect(firstRowCells[1].className).toContain('hidden md:table-cell')
    })
  })

  describe('mobileCardRender', () => {
    it('renders mobile cards when mobileCardRender is provided', () => {
      const mobileCardRender = (row) => (
        <div data-testid="mobile-card">{row.name}</div>
      )
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          mobileCardRender={mobileCardRender}
        />
      )
      const cards = screen.getAllByTestId('mobile-card')
      expect(cards).toHaveLength(2)
      expect(cards[0]).toHaveTextContent('Alice')
      expect(cards[1]).toHaveTextContent('Bob')
    })

    it('hides table on mobile when mobileCardRender is provided', () => {
      const mobileCardRender = (row) => <div>{row.name}</div>
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          mobileCardRender={mobileCardRender}
        />
      )
      // The table wrapper should have hidden md:block class
      const tableWrapper = container.querySelector('.hidden.md\\:block')
      expect(tableWrapper).toBeInTheDocument()
    })

    it('applies correct card styling', () => {
      const mobileCardRender = (row) => <div>{row.name}</div>
      const { container } = render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          mobileCardRender={mobileCardRender}
        />
      )
      // Mobile card container should have md:hidden
      const mobileContainer = container.querySelector('.md\\:hidden')
      expect(mobileContainer).toBeInTheDocument()

      // Individual cards should have the required styling classes
      const cards = mobileContainer.children
      expect(cards[0].className).toContain('bg-site-surface')
      expect(cards[0].className).toContain('rounded-xl')
      expect(cards[0].className).toContain('border')
      expect(cards[0].className).toContain('border-site-border')
      expect(cards[0].className).toContain('p-4')
    })
  })

  describe('pagination', () => {
    it('does not render pagination when pages is 1', () => {
      render(<DataTable columns={sampleColumns} data={sampleData} pages={1} />)
      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument()
    })

    it('renders prev/next buttons', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={2} pages={5} />
      )
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Next page')).toBeInTheDocument()
    })

    it('disables prev button on first page', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={1} pages={5} />
      )
      expect(screen.getByLabelText('Previous page')).toBeDisabled()
    })

    it('disables next button on last page', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={5} pages={5} />
      )
      expect(screen.getByLabelText('Next page')).toBeDisabled()
    })

    it('renders page number buttons', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={1} pages={5} />
      )
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
      }
    })

    it('renders ellipsis for large page counts', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={1} pages={20} />
      )
      // Should show 1, 2, ..., 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
      expect(screen.getByText('…')).toBeInTheDocument()
    })

    it('calls onPageChange when clicking page number', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          page={1}
          pages={5}
          onPageChange={onPageChange}
        />
      )
      await user.click(screen.getByRole('button', { name: '3' }))
      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('calls onPageChange when clicking prev/next', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          page={3}
          pages={5}
          onPageChange={onPageChange}
        />
      )
      await user.click(screen.getByLabelText('Previous page'))
      expect(onPageChange).toHaveBeenCalledWith(2)

      await user.click(screen.getByLabelText('Next page'))
      expect(onPageChange).toHaveBeenCalledWith(4)
    })

    it('shows "Showing X to Y of Z" when pageSize and total are provided', () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          page={2}
          pages={5}
          pageSize={10}
          total={50}
        />
      )
      expect(screen.getByText('Showing 11 to 20 of 50')).toBeInTheDocument()
    })

    it('caps endItem to total on last page', () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          page={3}
          pages={3}
          pageSize={10}
          total={23}
        />
      )
      expect(screen.getByText('Showing 21 to 23 of 23')).toBeInTheDocument()
    })

    it('falls back to "Page X of Y" when pageSize/total not provided', () => {
      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          page={2}
          pages={5}
        />
      )
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    })

    it('highlights current page button', () => {
      render(
        <DataTable columns={sampleColumns} data={sampleData} page={3} pages={5} />
      )
      const currentBtn = screen.getByRole('button', { name: '3' })
      expect(currentBtn.className).toContain('bg-site-accent')
      expect(currentBtn).toBeDisabled()
    })
  })
})
