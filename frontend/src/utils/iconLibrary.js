import {
  Map, BookOpen, Settings, Target, Monitor, Palette,
  Microscope, Trophy, Brain, Ruler, Globe, Rocket,
  Code, Database, Cpu, Wifi, Shield, Lock,
  Zap, Flame, Star, Heart, Music, Camera,
  Pen, FileText, Folder, Layers, Layout, Grid3x3,
  BarChart3, PieChart, TrendingUp, Activity,
  Users, User, MessageCircle, Mail,
  Cloud, Sun, Moon, Compass,
  Lightbulb, Wrench, Hammer, Scissors,
  Gamepad2, Dumbbell, Bike, TreePine,
  Atom, FlaskConical, GraduationCap, BookMarked,
  Headphones, Video, Image, Figma,
  Terminal, GitBranch, Bug, Package,
  Sparkles, Crown, Diamond, Gem,
  Clock, Calendar, Bell, Bookmark
} from 'lucide-react';

const ICON_MAP = {
  Map, BookOpen, Settings, Target, Monitor, Palette,
  Microscope, Trophy, Brain, Ruler, Globe, Rocket,
  Code, Database, Cpu, Wifi, Shield, Lock,
  Zap, Flame, Star, Heart, Music, Camera,
  Pen, FileText, Folder, Layers, Layout, Grid3x3,
  BarChart3, PieChart, TrendingUp, Activity,
  Users, User, MessageCircle, Mail,
  Cloud, Sun, Moon, Compass,
  Lightbulb, Wrench, Hammer, Scissors,
  Gamepad2, Dumbbell, Bike, TreePine,
  Atom, FlaskConical, GraduationCap, BookMarked,
  Headphones, Video, Image, Figma,
  Terminal, GitBranch, Bug, Package,
  Sparkles, Crown, Diamond, Gem,
  Clock, Calendar, Bell, Bookmark
};

// 9 default icons shown in the quick picker
export const DEFAULT_ICONS = [
  'Map', 'BookOpen', 'Code', 'Target', 'Brain',
  'Rocket', 'Palette', 'Trophy', 'GraduationCap'
];

export const ICON_CATEGORIES = {
  Learning: ['BookOpen', 'GraduationCap', 'BookMarked', 'Brain', 'Lightbulb', 'Pen', 'FileText', 'Ruler'],
  Tech: ['Code', 'Terminal', 'Database', 'Cpu', 'GitBranch', 'Bug', 'Package', 'Monitor', 'Wifi', 'Globe'],
  Creative: ['Palette', 'Camera', 'Music', 'Headphones', 'Video', 'Image', 'Figma', 'Sparkles'],
  Science: ['Atom', 'FlaskConical', 'Microscope', 'Activity', 'Compass'],
  Data: ['BarChart3', 'PieChart', 'TrendingUp', 'Grid3x3', 'Layers', 'Layout'],
  Goals: ['Target', 'Trophy', 'Star', 'Crown', 'Diamond', 'Gem', 'Flame', 'Zap', 'Rocket'],
  Social: ['Users', 'User', 'MessageCircle', 'Mail', 'Heart'],
  Tools: ['Settings', 'Wrench', 'Hammer', 'Scissors', 'Shield', 'Lock'],
  Nature: ['Sun', 'Moon', 'Cloud', 'TreePine'],
  Lifestyle: ['Gamepad2', 'Dumbbell', 'Bike', 'Map'],
  General: ['Folder', 'Bookmark', 'Bell', 'Clock', 'Calendar']
};

export const ALL_ICONS = Object.keys(ICON_MAP);

export function getIconComponent(name) {
  return ICON_MAP[name] || null;
}
