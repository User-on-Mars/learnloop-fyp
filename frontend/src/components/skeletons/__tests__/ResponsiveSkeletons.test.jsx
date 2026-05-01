import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  HeroSectionSkeleton,
  DataTableSkeleton,
  CardGridSkeleton,
  ActiveSessionCardSkeleton,
  RoomCardSkeleton,
  SkillMapCardSkeleton,
} from '../ResponsiveSkeletons';

describe('ResponsiveSkeletons', () => {
  describe('HeroSectionSkeleton', () => {
    it('renders with default props', () => {
      const { container } = render(<HeroSectionSkeleton />);
      
      // Check for gradient background
      expect(container.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
      
      // Check for decorative elements
      expect(container.querySelectorAll('.blur-3xl, .blur-2xl')).toHaveLength(2);
      
      // Check for responsive layout classes
      expect(container.querySelector('.flex-col.sm\\:flex-row')).toBeInTheDocument();
      
      // Check for default 4 stat cards
      expect(container.querySelectorAll('.grid > div')).toHaveLength(4);
    });

    it('renders custom number of stats', () => {
      const { container } = render(<HeroSectionSkeleton statsCount={6} />);
      expect(container.querySelectorAll('.grid > div')).toHaveLength(6);
    });

    it('hides action buttons when showActions is false', () => {
      const { container } = render(<HeroSectionSkeleton showActions={false} />);
      
      // Action buttons container should not exist
      const actionButtons = container.querySelector('.flex-col.sm\\:flex-row.items-stretch');
      if (actionButtons) {
        expect(actionButtons.querySelectorAll('.h-10, .sm\\:h-11')).toHaveLength(0);
      } else {
        // If container doesn't exist, that's also valid (buttons are hidden)
        expect(actionButtons).toBeNull();
      }
    });

    it('applies custom stats columns', () => {
      const { container } = render(
        <HeroSectionSkeleton statsColumns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
      );
      
      const statsGrid = container.querySelector('.grid-cols-2');
      expect(statsGrid).toBeInTheDocument();
    });

    it('has responsive padding classes', () => {
      const { container } = render(<HeroSectionSkeleton />);
      const mainContainer = container.querySelector('.p-4.sm\\:p-6.lg\\:p-8');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('DataTableSkeleton', () => {
    it('renders desktop table view', () => {
      const { container } = render(<DataTableSkeleton />);
      
      // Desktop table should be hidden on mobile
      const desktopTable = container.querySelector('.hidden.sm\\:block');
      expect(desktopTable).toBeInTheDocument();
    });

    it('renders mobile card view', () => {
      const { container } = render(<DataTableSkeleton />);
      
      // Mobile cards should be hidden on desktop
      const mobileCards = container.querySelector('.sm\\:hidden');
      expect(mobileCards).toBeInTheDocument();
    });

    it('renders correct number of rows', () => {
      const { container } = render(<DataTableSkeleton rows={3} />);
      
      // Check desktop rows
      const desktopRows = container.querySelectorAll('.hidden.sm\\:block .divide-y > div');
      expect(desktopRows).toHaveLength(3);
      
      // Check mobile cards
      const mobileCards = container.querySelectorAll('.sm\\:hidden > div');
      expect(mobileCards).toHaveLength(3);
    });

    it('hides header when showHeader is false', () => {
      const { container } = render(<DataTableSkeleton showHeader={false} />);
      
      // Header should not exist
      const header = container.querySelector('.grid.grid-cols-12.gap-3.px-3.pb-2');
      expect(header).not.toBeInTheDocument();
    });

    it('ensures minimum tap target height', () => {
      const { container } = render(<DataTableSkeleton rows={2} />);
      
      // Check desktop rows have min height
      const desktopRows = container.querySelectorAll('.hidden.sm\\:block .divide-y > div');
      desktopRows.forEach(row => {
        expect(row).toHaveStyle({ minHeight: '44px' });
      });
      
      // Check mobile cards have min height
      const mobileCards = container.querySelectorAll('.sm\\:hidden > div');
      mobileCards.forEach(card => {
        expect(card).toHaveStyle({ minHeight: '44px' });
      });
    });
  });

  describe('CardGridSkeleton', () => {
    it('renders with default props', () => {
      const { container } = render(<CardGridSkeleton />);
      
      // Check for responsive grid classes
      expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
      
      // Check for default 6 cards
      expect(container.querySelectorAll('.grid > div')).toHaveLength(6);
    });

    it('renders custom number of cards', () => {
      const { container } = render(<CardGridSkeleton cards={9} />);
      expect(container.querySelectorAll('.grid > div')).toHaveLength(9);
    });

    it('applies custom columns', () => {
      const { container } = render(
        <CardGridSkeleton columns="grid-cols-1 sm:grid-cols-3 lg:grid-cols-4" />
      );
      
      const grid = container.querySelector('.grid-cols-1');
      expect(grid).toBeInTheDocument();
    });

    it('applies custom card height', () => {
      const { container } = render(<CardGridSkeleton cardHeight={150} />);
      
      const cards = container.querySelectorAll('.grid > div');
      cards.forEach(card => {
        expect(card).toHaveStyle({ minHeight: '150px' });
      });
    });
  });

  describe('ActiveSessionCardSkeleton', () => {
    it('renders with default count', () => {
      const { container } = render(<ActiveSessionCardSkeleton />);
      
      // Check for 2 cards by default
      expect(container.querySelectorAll('.grid > div')).toHaveLength(2);
    });

    it('renders custom count', () => {
      const { container } = render(<ActiveSessionCardSkeleton count={4} />);
      expect(container.querySelectorAll('.grid > div')).toHaveLength(4);
    });

    it('uses responsive grid layout', () => {
      const { container } = render(<ActiveSessionCardSkeleton />);
      expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2')).toBeInTheDocument();
    });
  });

  describe('RoomCardSkeleton', () => {
    it('renders with default count', () => {
      const { container } = render(<RoomCardSkeleton />);
      
      // Check for 6 cards by default
      expect(container.querySelectorAll('.grid > div')).toHaveLength(6);
    });

    it('renders custom count', () => {
      const { container } = render(<RoomCardSkeleton count={3} />);
      expect(container.querySelectorAll('.grid > div')).toHaveLength(3);
    });

    it('uses 3-column responsive grid', () => {
      const { container } = render(<RoomCardSkeleton />);
      expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
    });
  });

  describe('SkillMapCardSkeleton', () => {
    it('renders with default count', () => {
      const { container } = render(<SkillMapCardSkeleton />);
      
      // Check for 6 cards by default
      expect(container.querySelectorAll('.grid > div')).toHaveLength(6);
    });

    it('renders custom count', () => {
      const { container } = render(<SkillMapCardSkeleton count={9} />);
      expect(container.querySelectorAll('.grid > div')).toHaveLength(9);
    });

    it('uses 3-column responsive grid', () => {
      const { container } = render(<SkillMapCardSkeleton />);
      expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('all skeletons have animate-pulse class', () => {
      const { container: hero } = render(<HeroSectionSkeleton />);
      const { container: table } = render(<DataTableSkeleton />);
      const { container: grid } = render(<CardGridSkeleton />);
      
      expect(hero.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
      expect(table.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
      expect(grid.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('all skeletons use consistent gray colors', () => {
      const { container: hero } = render(<HeroSectionSkeleton />);
      const { container: table } = render(<DataTableSkeleton />);
      const { container: grid } = render(<CardGridSkeleton />);
      
      // Check for bg-gray-200 usage
      expect(hero.querySelectorAll('.bg-gray-200').length).toBeGreaterThan(0);
      expect(table.querySelectorAll('.bg-gray-200').length).toBeGreaterThan(0);
      expect(grid.querySelectorAll('.bg-gray-200').length).toBeGreaterThan(0);
    });
  });
});
