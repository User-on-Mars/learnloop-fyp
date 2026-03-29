import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SkillList from '../SkillList';
import { SkillMapProvider } from '../../context/SkillMapContext';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the SkillMapContext
const mockSkills = [
  {
    _id: 'skill1',
    name: 'Learn React Hooks',
    nodeCount: 8,
    completedNodes: 3,
    completionPercentage: 37.5,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    _id: 'skill2',
    name: 'Master TypeScript',
    nodeCount: 10,
    completedNodes: 5,
    completionPercentage: 50,
    createdAt: '2024-01-14T10:00:00Z'
  }
];

const mockDeleteSkill = vi.fn();
const mockLoadSkills = vi.fn();

vi.mock('../../context/SkillMapContext', async () => {
  const actual = await vi.importActual('../../context/SkillMapContext');
  return {
    ...actual,
    useSkillMap: () => ({
      skills: mockSkills,
      deleteSkill: mockDeleteSkill,
      loadSkills: mockLoadSkills,
      isLoading: false,
      error: null,
    }),
  };
});

describe('SkillList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skill list with skills', () => {
    render(
      <BrowserRouter>
        <SkillList />
      </BrowserRouter>
    );

    expect(screen.getByText('Skill Maps')).toBeInTheDocument();
    expect(screen.getByText('Learn React Hooks')).toBeInTheDocument();
    expect(screen.getByText('Master TypeScript')).toBeInTheDocument();
  });

  it('displays skill progress correctly', () => {
    render(
      <BrowserRouter>
        <SkillList />
      </BrowserRouter>
    );

    expect(screen.getByText('38%')).toBeInTheDocument(); // Rounded from 37.5
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('3/8 nodes completed')).toBeInTheDocument();
    expect(screen.getByText('5/10 nodes completed')).toBeInTheDocument();
  });

  it('navigates to skill detail when skill is clicked', () => {
    render(
      <BrowserRouter>
        <SkillList />
      </BrowserRouter>
    );

    const skillCard = screen.getByText('Learn React Hooks').closest('div');
    fireEvent.click(skillCard);

    expect(mockNavigate).toHaveBeenCalledWith('/skills/skill1');
  });

  it('shows create skill modal when create button is clicked', () => {
    render(
      <BrowserRouter>
        <SkillList />
      </BrowserRouter>
    );

    const createButton = screen.getAllByText('Create Skill')[0];
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Skill')).toBeInTheDocument();
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    render(
      <BrowserRouter>
        <SkillList />
      </BrowserRouter>
    );

    const skillCard = screen.getByText('Learn React Hooks').closest('div');
    
    // Hover to show delete button
    fireEvent.mouseEnter(skillCard);
    
    const deleteButtons = screen.getAllByLabelText('Delete skill');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
});
