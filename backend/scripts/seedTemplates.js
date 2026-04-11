import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SkillMapTemplate from '../src/models/SkillMapTemplate.js';

dotenv.config();

// Built-in templates from frontend/src/data/templates.ts
const BUILT_IN_TEMPLATES = [
  {
    id: 'web-dev-fundamentals',
    title: 'Web Dev Fundamentals',
    description: 'Learn the core technologies of the web from HTML to deployment',
    icon: 'Code',
    goal: 'Build a website',
    nodes: [
      {
        title: 'HTML Basics',
        description: 'Document structure, semantic elements, forms, and accessibility fundamentals',
        sessions: [
          { title: 'Document Structure', description: 'Learn HTML5 document structure, head/body, and semantic tags' },
          { title: 'Forms & Inputs', description: 'Build forms with validation, input types, and accessibility' },
        ],
      },
      {
        title: 'CSS Styling',
        description: 'Selectors, box model, flexbox, grid, and responsive design patterns',
        sessions: [
          { title: 'Box Model & Selectors', description: 'Master the CSS box model, specificity, and selector patterns' },
          { title: 'Flexbox & Grid', description: 'Build responsive layouts with flexbox and CSS grid' },
        ],
      },
      {
        title: 'JavaScript Core',
        description: 'Variables, functions, DOM manipulation, events, and async programming',
        sessions: [
          { title: 'Variables & Functions', description: 'Learn let/const, arrow functions, and scope' },
          { title: 'DOM & Events', description: 'Manipulate the DOM, handle events, and build interactive pages' },
        ],
      },
      {
        title: 'Git & GitHub',
        description: 'Version control basics, branching, merging, and collaboration workflows',
        sessions: [
          { title: 'Git Basics', description: 'Init, add, commit, push, and pull workflows' },
          { title: 'Branching & PRs', description: 'Create branches, resolve conflicts, and open pull requests' },
        ],
      },
      {
        title: 'React Intro',
        description: 'Components, props, state, hooks, and building interactive UIs',
        sessions: [
          { title: 'Components & Props', description: 'Build reusable components and pass data with props' },
          { title: 'State & Hooks', description: 'Manage state with useState and useEffect' },
        ],
      },
      {
        title: 'Deploy & Ship',
        description: 'Build tools, hosting platforms, CI/CD basics, and going live',
        sessions: [
          { title: 'Build & Bundle', description: 'Configure build tools and optimize for production' },
          { title: 'Deploy to Cloud', description: 'Deploy to a hosting platform and set up CI/CD' },
        ],
      },
    ],
  },
  {
    id: 'guitar-practice-path',
    title: 'Guitar Practice Path',
    description: 'A structured path from first chords to playing full songs confidently',
    icon: 'Music',
    goal: 'Play full songs',
    nodes: [
      {
        title: 'Open Chords',
        description: 'Learn the essential open chords: G, C, D, Em, Am and smooth transitions between them',
        sessions: [
          { title: 'G, C, D Chords', description: 'Practice fretting and strumming G, C, and D major chords' },
          { title: 'Em & Am Chords', description: 'Learn E minor and A minor shapes and switch between all five chords' },
        ],
      },
      {
        title: 'Strumming',
        description: 'Develop consistent rhythm with downstrokes, upstrokes, and common strum patterns',
        sessions: [
          { title: 'Basic Patterns', description: 'Practice down-down-up-up-down-up and similar patterns with a metronome' },
          { title: 'Muted Strums', description: 'Add percussive muted strums to create dynamic rhythm' },
        ],
      },
      {
        title: 'Fingerpicking',
        description: 'Thumb and finger independence, arpeggios, and Travis picking basics',
        sessions: [
          { title: 'Thumb & Fingers', description: 'Assign fingers to strings and practice simple arpeggio patterns' },
          { title: 'Travis Picking', description: 'Alternate bass notes with melody using Travis picking technique' },
        ],
      },
      {
        title: 'Barre Chords',
        description: 'F major, B minor, and moveable barre chord shapes up the neck',
        sessions: [
          { title: 'F Major Shape', description: 'Build finger strength for the F major barre chord' },
          { title: 'Moveable Shapes', description: 'Use E-shape and A-shape barres to play chords anywhere on the neck' },
        ],
      },
      {
        title: 'Song Practice',
        description: 'Apply chords, strumming, and fingerpicking to learn complete songs',
        sessions: [
          { title: 'Easy Songs', description: 'Learn two-chord and three-chord songs end to end' },
          { title: 'Full Arrangement', description: 'Play a complete song with intro, verses, chorus, and outro' },
        ],
      },
    ],
  },
  {
    id: 'spanish-basics',
    title: 'Spanish Basics',
    description: 'Build a foundation in Spanish from greetings to basic conversation',
    icon: 'Globe',
    goal: 'Hold a chat',
    nodes: [
      {
        title: 'Greetings',
        description: 'Common greetings, farewells, and polite expressions for everyday encounters',
        sessions: [
          { title: 'Hello & Goodbye', description: 'Practice hola, buenos dias, adios, and hasta luego' },
          { title: 'Polite Phrases', description: 'Learn por favor, gracias, de nada, and lo siento' },
        ],
      },
      {
        title: 'Core Vocabulary',
        description: 'Essential nouns, adjectives, and numbers for daily life situations',
        sessions: [
          { title: 'Numbers & Colors', description: 'Count to 100 and name common colors in Spanish' },
          { title: 'Food & Places', description: 'Learn vocabulary for restaurants, shops, and directions' },
        ],
      },
      {
        title: 'Verb Basics',
        description: 'Present tense conjugation of ser, estar, tener, ir, and other high-frequency verbs',
        sessions: [
          { title: 'Ser & Estar', description: 'Understand the two forms of to be and when to use each' },
          { title: 'Common Verbs', description: 'Conjugate tener, ir, querer, and poder in present tense' },
        ],
      },
      {
        title: 'Sentences',
        description: 'Form questions, negations, and simple declarative sentences',
        sessions: [
          { title: 'Questions', description: 'Form questions with que, donde, cuando, and como' },
          { title: 'Negation', description: 'Use no, nunca, and nada to build negative sentences' },
        ],
      },
      {
        title: 'Conversation',
        description: 'Practice ordering food, asking for directions, and introducing yourself',
        sessions: [
          { title: 'Introductions', description: 'Introduce yourself, state your age, and describe your hobbies' },
          { title: 'At a Restaurant', description: 'Order food, ask for the bill, and handle common restaurant phrases' },
          { title: 'Asking Directions', description: 'Ask for and understand directions to common places' },
        ],
      },
    ],
  },
  {
    id: 'data-science-intro',
    title: 'Data Science Intro',
    description: 'From spreadsheets to machine learning, explore the data science pipeline',
    icon: 'BarChart3',
    goal: 'Analyze data',
    nodes: [
      {
        title: 'Data Literacy',
        description: 'Understand data types, distributions, and how to ask good questions of data',
        sessions: [
          { title: 'Data Types', description: 'Learn categorical, numerical, and ordinal data types' },
          { title: 'Asking Questions', description: 'Frame analytical questions and identify relevant data sources' },
        ],
      },
      {
        title: 'Spreadsheets',
        description: 'Pivot tables, formulas, charts, and data cleaning in spreadsheet tools',
        sessions: [
          { title: 'Formulas & Pivots', description: 'Use VLOOKUP, SUMIF, and pivot tables to summarize data' },
          { title: 'Charts', description: 'Create bar charts, line charts, and scatter plots to visualize trends' },
        ],
      },
      {
        title: 'Python Basics',
        description: 'Variables, loops, functions, and libraries for data manipulation',
        sessions: [
          { title: 'Syntax & Types', description: 'Learn Python variables, lists, dicts, and control flow' },
          { title: 'Pandas Intro', description: 'Load, filter, and aggregate data with pandas DataFrames' },
        ],
      },
      {
        title: 'Visualization',
        description: 'Create meaningful charts and dashboards with matplotlib and seaborn',
        sessions: [
          { title: 'Matplotlib Basics', description: 'Plot line, bar, and scatter charts with matplotlib' },
          { title: 'Seaborn & Style', description: 'Use seaborn for statistical plots and polished styling' },
        ],
      },
      {
        title: 'Statistics',
        description: 'Descriptive stats, probability, hypothesis testing, and correlation',
        sessions: [
          { title: 'Descriptive Stats', description: 'Calculate mean, median, mode, and standard deviation' },
          { title: 'Hypothesis Testing', description: 'Run t-tests and chi-square tests to validate assumptions' },
        ],
      },
      {
        title: 'ML Intro',
        description: 'Supervised learning basics: regression, classification, and model evaluation',
        sessions: [
          { title: 'Linear Regression', description: 'Fit a regression model and interpret coefficients' },
          { title: 'Classification', description: 'Train a classifier and evaluate with accuracy and confusion matrix' },
        ],
      },
    ],
  },
  {
    id: 'ui-design-basics',
    title: 'UI Design Basics',
    description: 'Learn visual design principles and tools to create polished user interfaces',
    icon: 'Palette',
    goal: 'Design a UI',
    nodes: [
      {
        title: 'Design Thinking',
        description: 'Empathize, define, ideate, prototype, and test as a creative framework',
        sessions: [
          { title: 'Empathy & Define', description: 'Conduct user research and define the core problem statement' },
          { title: 'Ideate & Prototype', description: 'Brainstorm solutions and build low-fidelity prototypes' },
        ],
      },
      {
        title: 'Typography',
        description: 'Font pairing, hierarchy, readability, and typographic scale for the web',
        sessions: [
          { title: 'Font Pairing', description: 'Choose complementary fonts and establish a type scale' },
          { title: 'Hierarchy', description: 'Use size, weight, and spacing to guide the reader eye' },
        ],
      },
      {
        title: 'Color Theory',
        description: 'Color wheels, palettes, contrast ratios, and accessible color choices',
        sessions: [
          { title: 'Palettes', description: 'Build a cohesive color palette with primary, secondary, and accent colors' },
          { title: 'Contrast & A11y', description: 'Check contrast ratios and ensure colors meet accessibility standards' },
        ],
      },
      {
        title: 'Layout & Grid',
        description: 'Grid systems, spacing scales, alignment, and responsive layout patterns',
        sessions: [
          { title: 'Grid Systems', description: 'Use 8-point grids and column layouts to structure pages' },
          { title: 'Responsive Layout', description: 'Adapt designs for mobile, tablet, and desktop breakpoints' },
        ],
      },
      {
        title: 'Components',
        description: 'Buttons, inputs, cards, modals, and building a reusable component library',
        sessions: [
          { title: 'Core Components', description: 'Design buttons, inputs, and cards with consistent styling' },
          { title: 'Component Library', description: 'Organize components into a reusable design system' },
        ],
      },
      {
        title: 'Prototyping',
        description: 'Interactive prototypes, transitions, user flows, and usability testing',
        sessions: [
          { title: 'Interactive Flows', description: 'Link screens together with transitions and micro-interactions' },
          { title: 'Usability Testing', description: 'Run a usability test session and iterate on feedback' },
        ],
      },
    ],
  },
];

async function seedTemplates() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Clearing existing built-in templates...');
    await SkillMapTemplate.deleteMany({ isBuiltIn: true });

    console.log('📝 Seeding built-in templates...');
    const templates = BUILT_IN_TEMPLATES.map(template => ({
      title: template.title,
      description: template.description,
      icon: template.icon,
      goal: template.goal,
      nodes: template.nodes,
      isPublished: true,
      isBuiltIn: true,
      createdBy: 'system',
      usageCount: 0
    }));

    const result = await SkillMapTemplate.insertMany(templates);
    console.log(`✅ Seeded ${result.length} built-in templates`);

    result.forEach(template => {
      console.log(`   - ${template.title} (${template.nodes.length} nodes)`);
    });

    console.log('🎉 Template seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();
