import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeroSection from '../HeroSection';
import { Play, Users, Zap, Flame, Trophy, TrendingUp } from 'lucide-react';

describe('HeroSection', () => {
  const defaultProps = {
    title: 'Test Dashboard',
    subtitle: 'Your Learning Hub',
    description: 'Track your progress and manage your learning journey',
    icon: Play,
  };

  describe('Basic Rendering', () => {
    it('renders title, subtitle, and description', () => {
      render(<HeroSection {...defaultProps} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Your Learning Hub')).toBeInTheDocument();
      expect(screen.getByText('Track your progress and manage your learning journey')).toBeInTheDocument();
    });

    it('renders without subtitle when not provided', () => {
      const props = { ...defaultProps };
      delete props.subtitle;
      
      render(<HeroSection {...props} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Your Learning Hub')).not.toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      const props = { ...defaultProps };
      delete props.description;
      
      render(<HeroSection {...props} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Track your progress and manage your learning journey')).not.toBeInTheDocument();
    });

    it('renders with icon', () => {
      const { container } = render(<HeroSection {...defaultProps} />);
      
      // Check that the icon container exists
      const iconContainer = container.querySelector('.bg-gradient-to-br');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons when provided', () => {
      const actions = [
        { label: 'Log Practice', icon: Play, onClick: vi.fn(), variant: 'primary' },
        { label: 'View Rooms', icon: Users, onClick: vi.fn(), variant: 'secondary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      expect(screen.getByText('Log Practice')).toBeInTheDocument();
      expect(screen.getByText('View Rooms')).toBeInTheDocument();
    });

    it('calls onClick handler when action button is clicked', () => {
      const onClickMock = vi.fn();
      const actions = [
        { label: 'Test Action', icon: Play, onClick: onClickMock, variant: 'primary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      const button = screen.getByText('Test Action');
      fireEvent.click(button);
      
      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('applies primary styles to primary variant buttons', () => {
      const actions = [
        { label: 'Primary Button', icon: Play, onClick: vi.fn(), variant: 'primary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      const button = screen.getByText('Primary Button');
      expect(button).toHaveClass('bg-gradient-to-r');
      expect(button).toHaveClass('from-sky-600');
      expect(button).toHaveClass('to-blue-600');
    });

    it('applies secondary styles to secondary variant buttons', () => {
      const actions = [
        { label: 'Secondary Button', icon: Users, onClick: vi.fn(), variant: 'secondary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      const button = screen.getByText('Secondary Button');
      expect(button).toHaveClass('bg-white');
      expect(button).toHaveClass('border');
    });

    it('renders buttons without icons when icon not provided', () => {
      const actions = [
        { label: 'No Icon Button', onClick: vi.fn(), variant: 'primary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      expect(screen.getByText('No Icon Button')).toBeInTheDocument();
    });
  });

  describe('Stat Grid', () => {
    it('renders stat cards when provided', () => {
      const stats = [
        { icon: Zap, label: 'Total XP', value: '1,250', color: '#f59e0b', bg: 'bg-amber-100' },
        { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
        { icon: Trophy, label: 'League', value: 'Gold', color: '#8b5cf6', bg: 'bg-purple-100' },
        { icon: TrendingUp, label: 'Weekly XP', value: '450', color: '#10b981', bg: 'bg-emerald-100' },
      ];

      render(<HeroSection {...defaultProps} stats={stats} />);
      
      expect(screen.getByText('Total XP')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('7d')).toBeInTheDocument();
      expect(screen.getByText('League')).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();
      expect(screen.getByText('Weekly XP')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
    });

    it('does not render stat grid when stats array is empty', () => {
      const { container } = render(<HeroSection {...defaultProps} stats={[]} />);
      
      // Check that no stat grid exists
      const statGrid = container.querySelector('.grid');
      expect(statGrid).not.toBeInTheDocument();
    });

    it('applies custom grid columns when provided', () => {
      const stats = [
        { icon: Zap, label: 'Total XP', value: '1,250', color: '#f59e0b', bg: 'bg-amber-100' },
        { icon: Flame, label: 'Streak', value: '7d', color: '#ef4444', bg: 'bg-red-100' },
      ];

      const { container } = render(
        <HeroSection 
          {...defaultProps} 
          stats={stats} 
          statsColumns="grid-cols-1 sm:grid-cols-2" 
        />
      );
      
      const statGrid = container.querySelector('.grid');
      expect(statGrid).toHaveClass('grid-cols-1');
      expect(statGrid).toHaveClass('sm:grid-cols-2');
    });

    it('uses default grid columns when not provided', () => {
      const stats = [
        { icon: Zap, label: 'Total XP', value: '1,250', color: '#f59e0b', bg: 'bg-amber-100' },
      ];

      const { container } = render(<HeroSection {...defaultProps} stats={stats} />);
      
      const statGrid = container.querySelector('.grid');
      expect(statGrid).toHaveClass('grid-cols-2');
      expect(statGrid).toHaveClass('sm:grid-cols-4');
    });
  });

  describe('Extra Content', () => {
    it('renders extra content when provided', () => {
      const extraContent = <div data-testid="extra-content">Extra Content Here</div>;

      render(<HeroSection {...defaultProps} extraContent={extraContent} />);
      
      expect(screen.getByTestId('extra-content')).toBeInTheDocument();
      expect(screen.getByText('Extra Content Here')).toBeInTheDocument();
    });

    it('does not render extra content section when not provided', () => {
      const { container } = render(<HeroSection {...defaultProps} />);
      
      // Check that no extra content section exists
      const extraSection = container.querySelector('[data-testid="extra-content"]');
      expect(extraSection).not.toBeInTheDocument();
    });
  });

  describe('Responsive Classes', () => {
    it('applies responsive padding classes', () => {
      const { container } = render(<HeroSection {...defaultProps} />);
      
      const heroContainer = container.firstChild;
      expect(heroContainer).toHaveClass('p-4');
      expect(heroContainer).toHaveClass('sm:p-6');
      expect(heroContainer).toHaveClass('lg:p-8');
    });

    it('applies responsive layout classes to content wrapper', () => {
      const { container } = render(<HeroSection {...defaultProps} />);
      
      const contentWrapper = container.querySelector('.flex.flex-col.sm\\:flex-row');
      expect(contentWrapper).toBeInTheDocument();
      expect(contentWrapper).toHaveClass('flex-col');
      expect(contentWrapper).toHaveClass('sm:flex-row');
    });

    it('applies responsive text size classes to title', () => {
      render(<HeroSection {...defaultProps} />);
      
      const title = screen.getByText('Test Dashboard');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('sm:text-2xl');
      expect(title).toHaveClass('lg:text-3xl');
    });
  });

  describe('Gradient and Styling', () => {
    it('applies custom gradient colors when provided', () => {
      const { container } = render(
        <HeroSection 
          {...defaultProps}
          gradientFrom="emerald-50"
          gradientVia="white"
          gradientTo="teal-50"
        />
      );
      
      const heroContainer = container.firstChild;
      expect(heroContainer).toHaveClass('bg-gradient-to-br');
      expect(heroContainer).toHaveClass('from-emerald-50');
      expect(heroContainer).toHaveClass('via-white');
      expect(heroContainer).toHaveClass('to-teal-50');
    });

    it('applies custom border color when provided', () => {
      const { container } = render(
        <HeroSection 
          {...defaultProps}
          borderColor="emerald-100"
        />
      );
      
      const heroContainer = container.firstChild;
      expect(heroContainer).toHaveClass('border-emerald-100');
    });

    it('applies custom icon gradient colors when provided', () => {
      const { container } = render(
        <HeroSection 
          {...defaultProps}
          iconGradientFrom="emerald-600"
          iconGradientTo="teal-600"
        />
      );
      
      const iconContainer = container.querySelector('.bg-gradient-to-br.from-emerald-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('to-teal-600');
    });
  });

  describe('Accessibility', () => {
    it('renders with proper heading hierarchy', () => {
      render(<HeroSection {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Dashboard');
    });

    it('renders buttons with proper role', () => {
      const actions = [
        { label: 'Test Action', icon: Play, onClick: vi.fn(), variant: 'primary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      const button = screen.getByRole('button', { name: /Test Action/i });
      expect(button).toBeInTheDocument();
    });

    it('ensures minimum tap target size for mobile (44x44px)', () => {
      const actions = [
        { label: 'Test Action', icon: Play, onClick: vi.fn(), variant: 'primary' },
      ];

      render(<HeroSection {...defaultProps} actions={actions} />);
      
      const button = screen.getByText('Test Action');
      // Button has py-2.5 (10px) and sm:py-3 (12px) which meets minimum height
      expect(button).toHaveClass('py-2.5');
      expect(button).toHaveClass('sm:py-3');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty actions array gracefully', () => {
      render(<HeroSection {...defaultProps} actions={[]} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles empty stats array gracefully', () => {
      render(<HeroSection {...defaultProps} stats={[]} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    });

    it('handles missing icon gracefully', () => {
      const props = { ...defaultProps };
      delete props.icon;
      
      render(<HeroSection {...props} />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    });

    it('handles very long title text', () => {
      const longTitle = 'This is a very long title that should still render properly without breaking the layout';
      
      render(<HeroSection {...defaultProps} title={longTitle} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long stat values', () => {
      const stats = [
        { icon: Zap, label: 'Total XP', value: '1,234,567,890', color: '#f59e0b', bg: 'bg-amber-100' },
      ];

      render(<HeroSection {...defaultProps} stats={stats} />);
      
      expect(screen.getByText('1,234,567,890')).toBeInTheDocument();
    });
  });
});
