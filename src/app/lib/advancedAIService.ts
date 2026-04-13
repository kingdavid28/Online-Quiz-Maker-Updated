// Advanced AI Service - Intelligent Quiz Generation
// Follows best practices for more realistic AI behavior

interface AIQuestionRequest {
  topic: string;
  questionCount: number;
  questionTypes: ('multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank' | 'matching')[];
  difficulty: 'easy' | 'medium' | 'hard';
  context?: string;
}

interface AIQuestion {
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface KnowledgeBase {
  [key: string]: {
    facts: string[];
    concepts: string[];
    terminology: string[];
    relationships: string[];
    misconceptions: string[];
  };
}

export class AdvancedAIService {
  private static instance: AdvancedAIService;
  private knowledgeBase: KnowledgeBase;
  
  private constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }
  
  static getInstance(): AdvancedAIService {
    if (!AdvancedAIService.instance) {
      AdvancedAIService.instance = new AdvancedAIService();
    }
    return AdvancedAIService.instance;
  }
  
  async generateQuestions(request: AIQuestionRequest): Promise<AIQuestion[]> {
    try {
      // Simulate AI processing time
      await this.simulateProcessing(request.questionCount);
      
      // Get topic data for context-aware generation
      const topicData = this.getTopicData(request.topic);
      
      // Use provided context if available, otherwise use topic data
      const contextData = request.context || topicData;
      
      console.log('Generating questions for topic:', request.topic);
      console.log('Using context:', request.context ? 'Provided content' : 'Knowledge base');
      
      const questions: AIQuestion[] = [];
      
      for (let i = 0; i < request.questionCount; i++) {
        const questionType = this.selectQuestionType(request.questionTypes, i, request.questionCount);
        const difficulty = this.adjustDifficulty(request.difficulty, i, request.questionCount);
        
        const question = this.generateIntelligentQuestion(
          contextData,
          questionType,
          difficulty,
          i
        );
        
        questions.push(question);
      }
      
      // Post-process for quality and variety
      return this.postProcessQuestions(questions, request);
    } catch (error) {
      console.error('Advanced AI generation failed:', error);
      throw new Error('Failed to generate intelligent questions');
    }
  }
  
  private initializeKnowledgeBase(): KnowledgeBase {
    return {
      geography: {
        facts: [
          "Paris is the capital of France",
          "The Amazon River flows through South America",
          "Mount Everest is the highest mountain on Earth",
          "The Pacific Ocean is the largest ocean",
          "Africa is the second-largest continent",
          "The Great Wall of China is visible from space",
          "Antarctica is the coldest continent",
          "The Nile River is the longest river"
        ],
        concepts: [
          "Continents are large landmasses",
          "Oceans cover 71% of Earth's surface",
          "Capital cities are administrative centers",
          "Time zones divide the world longitudinally",
          "Climate zones vary by latitude",
          "Tectonic plates cause earthquakes"
        ],
        terminology: [
          "Peninsula", "Archipelago", "Isthmus", "Delta", "Plateau", "Equator", "Meridian", "Hemisphere"
        ],
        relationships: [
          "Countries belong to continents",
          "Cities are located in countries",
          "Rivers flow into oceans",
          "Mountains form mountain ranges",
          "Islands are surrounded by water"
        ],
        misconceptions: [
          "The Earth is flat",
          "All deserts are hot",
          "The North Pole is on land",
          "Rivers always flow south",
          "Continents don't move"
        ]
      },
      science: {
        facts: [
          "Water freezes at 0°C (32°F)",
          "Humans have 23 pairs of chromosomes",
          "Light travels at 299,792,458 m/s",
          "DNA stands for Deoxyribonucleic Acid",
          "The Earth orbits the Sun in 365.25 days",
          "Oxygen is the most abundant element in Earth's crust",
          "The human body has 206 bones",
          "Plants produce oxygen through photosynthesis"
        ],
        concepts: [
          "Gravity is a fundamental force",
          "Energy cannot be created or destroyed",
          "Cells are the basic unit of life",
          "Matter consists of atoms and molecules",
          "Evolution explains species diversity",
          "Ecosystems maintain balance"
        ],
        terminology: [
          "Photosynthesis", "Mitosis", "Osmosis", "Kinetic Energy", "Molecule", "Chromosome", "Ecosystem"
        ],
        relationships: [
          "Atoms form molecules",
          "Cells make up tissues",
          "Organisms belong to ecosystems",
          "Energy flows through food chains",
          "Genes determine traits"
        ],
        misconceptions: [
          "Heavier objects fall faster",
          "The Sun revolves around Earth",
          "Lightning never strikes twice",
          "Goldfish have 3-second memory",
          "Humans only use 10% of brain"
        ]
      },
      history: {
        facts: [
          "World War II ended in 1945",
          "The American Civil War lasted from 1861-1865",
          "The Berlin Wall fell in 1989",
          "The Renaissance began in the 14th century",
          "The printing press was invented by Gutenberg",
          "The moon landing occurred in 1969",
          "The Industrial Revolution started in Britain",
          "The Roman Empire fell in 476 AD"
        ],
        concepts: [
          "Revolutions bring major social change",
          "Empires expand and contract over time",
          "Technology drives historical progress",
          "Cultural exchange shapes civilizations",
          "Economic factors influence conflicts"
        ],
        terminology: [
          "Renaissance", "Reformation", "Industrialization", "Colonization", "Revolution", "Democracy", "Feudalism"
        ],
        relationships: [
          "Events cause historical consequences",
          "Leaders influence historical outcomes",
          "Inventions change societies",
          "Wars reshape political boundaries",
          "Trade connects civilizations"
        ],
        misconceptions: [
          "Columbus discovered America",
          "Medieval people thought Earth was flat",
          "Vikings wore horned helmets",
          "Napoleon was extremely short",
          "Ancient Romans were always clean"
        ]
      },
      mathematics: {
        facts: [
          "π (pi) approximately equals 3.14159",
          "The Pythagorean theorem: a² + b² = c²",
          "Prime numbers have exactly two divisors",
          "Zero is neither positive nor negative",
          "The Fibonacci sequence: 1,1,2,3,5,8...",
          "A circle has 360 degrees",
          "The square root of 2 is irrational",
          "Euler's number e ≈ 2.71828"
        ],
        concepts: [
          "Algebra uses symbols to represent numbers",
          "Geometry studies shapes and spaces",
          "Calculus deals with change and motion",
          "Statistics analyzes data patterns",
          "Logic forms the foundation of mathematics"
        ],
        terminology: [
          "Integer", "Variable", "Coefficient", "Equation", "Function", "Derivative", "Integral", "Matrix"
        ],
        relationships: [
          "Numbers form sets with properties",
          "Operations follow mathematical laws",
          "Theorems require logical proofs",
          "Functions map inputs to outputs",
          "Graphs represent relationships"
        ],
        misconceptions: [
          "Division always makes numbers smaller",
          "Zero has no value",
          "Fractions are always less than 1",
          "Negative numbers don't exist in reality",
          "Math is only about getting right answers"
        ]
      }
    };
  }
  
  private getTopicData(topic: string): any {
    const normalizedTopic = topic.toLowerCase();
    
    // Direct match
    if (this.knowledgeBase[normalizedTopic]) {
      return this.knowledgeBase[normalizedTopic];
    }
    
    // Partial match
    for (const [key, value] of Object.entries(this.knowledgeBase)) {
      if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
        return value;
      }
    }
    
    // Fallback to general knowledge
    return this.knowledgeBase.geography;
  }
  
  private async simulateProcessing(questionCount: number): Promise<void> {
    // Simulate realistic AI processing time
    const baseTime = 800;
    const perQuestionTime = 300;
    const totalTime = baseTime + (questionCount * perQuestionTime);
    const variance = Math.random() * 500 - 250;
    
    await new Promise(resolve => setTimeout(resolve, totalTime + variance));
  }
  
  private selectQuestionType(
    availableTypes: string[], 
    index: number, 
    totalCount: number
  ): string {
    // Intelligent question type distribution
    if (totalCount === 1) return availableTypes[0];
    
    // Ensure variety - avoid repeating the same type consecutively
    const availableWithoutLast = availableTypes.filter(type => type !== availableTypes[index % availableTypes.length]);
    
    // Weighted distribution (multiple-choice more common)
    const weights = {
      'multiple-choice': 0.4,
      'true-false': 0.2,
      'short-answer': 0.2,
      'fill-blank': 0.1,
      'matching': 0.1
    };
    
    const weightedTypes = availableWithoutLast.flatMap(type => 
      Array(Math.floor(weights[type] * 10)).fill(type)
    );
    
    return weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
  }
  
  private adjustDifficulty(baseDifficulty: string, index: number, totalCount: number): string {
    // Progressive difficulty - start easier, get harder
    if (totalCount <= 3) return baseDifficulty;
    
    const progress = index / (totalCount - 1);
    const difficulties = ['easy', 'medium', 'hard'];
    
    if (progress < 0.3) return 'easy';
    if (progress < 0.7) return 'medium';
    return 'hard';
  }
  
  private generateIntelligentQuestion(
    topicData: any, 
    questionType: string, 
    difficulty: string, 
    index: number
  ): AIQuestion {
    switch (questionType) {
      case 'multiple-choice':
        return this.generateSmartMultipleChoice(topicData, difficulty, index);
      case 'true-false':
        return this.generateIntelligentTrueFalse(topicData, difficulty, index);
      case 'short-answer':
        return this.generateContextualShortAnswer(topicData, difficulty, index);
      case 'fill-blank':
        return this.generateIntelligentFillBlank(topicData, difficulty, index);
      case 'matching':
        return this.generateConceptMatching(topicData, difficulty, index);
      default:
        return this.generateSmartMultipleChoice(topicData, difficulty, index);
    }
  }
  
  private generateSmartMultipleChoice(topicData: any, difficulty: string, index: number): AIQuestion {
    const fact = topicData.facts[index % topicData.facts.length];
    const concept = topicData.concepts[index % topicData.concepts.length];
    
    let question: string;
    let correctAnswer: string;
    let options: string[];
    
    if (difficulty === 'easy') {
      // Direct fact recall
      question = this.convertFactToQuestion(fact);
      correctAnswer = this.extractAnswerFromFact(fact);
      options = this.generateDistractors(correctAnswer, topicData, 3);
    } else if (difficulty === 'medium') {
      // Conceptual understanding
      question = this.convertConceptToQuestion(concept);
      correctAnswer = this.extractAnswerFromConcept(concept);
      options = this.generateDistractors(correctAnswer, topicData, 4);
    } else {
      // Complex reasoning
      question = this.generateComplexQuestion(topicData, index);
      correctAnswer = this.generateComplexAnswer(topicData, index);
      options = this.generateComplexDistractors(correctAnswer, topicData);
    }
    
    return {
      type: 'multiple-choice',
      question,
      options: this.shuffleArray([correctAnswer, ...options]),
      correctAnswer: correctAnswer,
      explanation: this.generateExplanation(fact, concept),
      points: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15,
      difficulty,
      category: this.categorizeQuestion(question)
    };
  }
  
  private generateIntelligentTrueFalse(topicData: any, difficulty: string, index: number): AIQuestion {
    let statement: string;
    let correctAnswer: boolean;
    
    if (difficulty === 'easy') {
      // Use common misconceptions
      const misconception = topicData.misconceptions[index % topicData.misconceptions.length];
      statement = misconception;
      correctAnswer = false;
    } else {
      // Use actual facts with slight variations
      const fact = topicData.facts[index % topicData.facts.length];
      statement = this.createVariationOfFact(fact);
      correctAnswer = this.evaluateStatement(statement, topicData);
    }
    
    return {
      type: 'true-false',
      question: `True or False: ${statement}`,
      correctAnswer: correctAnswer ? 'true' : 'false',
      explanation: correctAnswer ? 
        "This statement is correct based on established facts." :
        "This statement is incorrect. Here's why...",
      points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 8,
      difficulty,
      category: 'Critical Thinking'
    };
  }
  
  private generateContextualShortAnswer(topicData: any, difficulty: string, index: number): AIQuestion {
    let question: string;
    let expectedAnswer: string;
    
    if (difficulty === 'easy') {
      const terminology = topicData.terminology[index % topicData.terminology.length];
      question = `Define: ${terminology}`;
      expectedAnswer = this.generateDefinition(terminology, topicData);
    } else if (difficulty === 'medium') {
      const relationship = topicData.relationships[index % topicData.relationships.length];
      question = `Explain the relationship: ${relationship}`;
      expectedAnswer = this.explainRelationship(relationship, topicData);
    } else {
      question = this.generateAnalyticalQuestion(topicData, index);
      expectedAnswer = this.generateAnalyticalAnswer(topicData, index);
    }
    
    return {
      type: 'short-answer',
      question,
      correctAnswer: expectedAnswer,
      explanation: "This requires understanding of key concepts and their applications.",
      points: difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 20,
      difficulty,
      category: 'Analysis'
    };
  }
  
  private generateIntelligentFillBlank(topicData: any, difficulty: string, index: number): AIQuestion {
    const fact = topicData.facts[index % topicData.facts.length];
    const blankedFact = this.createBlankInFact(fact, difficulty);
    
    return {
      type: 'fill-blank',
      question: `Complete the statement: ${blankedFact.question}`,
      correctAnswer: blankedFact.answer,
      explanation: `The complete statement is: ${fact}`,
      points: difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 10,
      difficulty,
      category: 'Recall'
    };
  }
  
  private generateConceptMatching(topicData: any, difficulty: string, index: number): AIQuestion {
    const concepts = topicData.concepts.slice(index, Math.min(index + 3, topicData.concepts.length));
    const definitions = concepts.map(c => this.generateDefinition(c, topicData));
    
    return {
      type: 'matching',
      question: 'Match the following concepts with their definitions:',
      options: definitions,
      correctAnswer: concepts[0],
      explanation: "This tests your ability to connect concepts with their meanings.",
      points: 15,
      difficulty,
      category: 'Comprehension'
    };
  }
  
  // Helper methods for intelligent generation
  private convertFactToQuestion(fact: string): string {
    // Convert "Paris is the capital of France" to "What is the capital of France?"
    const match = fact.match(/^(.+) is (.+)$/);
    if (match) {
      return `What ${match[1].toLowerCase().includes('capital') ? 'is' : 'are'} ${match[1]}?`;
    }
    return `Based on the following fact: ${fact}`;
  }
  
  private extractAnswerFromFact(fact: string): string {
    const match = fact.match(/is (.+)$/);
    return match ? match[1] : fact;
  }
  
  private convertConceptToQuestion(concept: string): string {
    return `Which statement best explains: ${concept}?`;
  }
  
  private extractAnswerFromConcept(concept: string): string {
    return concept;
  }
  
  private generateDistractors(correctAnswer: string, topicData: any, count: number): string[] {
    const distractors = [];
    const used = new Set([correctAnswer]);
    
    while (distractors.length < count) {
      const source = Math.random() > 0.5 ? topicData.facts : topicData.concepts;
      const item = source[Math.floor(Math.random() * source.length)];
      const candidate = this.extractAnswerFromFact(item.toString());
      
      if (!used.has(candidate)) {
        distractors.push(candidate);
        used.add(candidate);
      }
    }
    
    return distractors;
  }
  
  private generateComplexDistractors(correctAnswer: string, topicData: any): string[] {
    // Generate more sophisticated distractors for hard questions
    return this.generateDistractors(correctAnswer, topicData, 4);
  }
  
  private createVariationOfFact(fact: string): string {
    // Create plausible but incorrect variations
    const variations = [
      fact.replace(/\d+/g, (match) => (parseInt(match) + 1).toString()),
      fact.replace(/is/g, 'was'),
      fact.replace(/largest/g, 'smallest'),
      fact.replace(/first/g, 'last')
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }
  
  private evaluateStatement(statement: string, topicData: any): boolean {
    // Check if statement matches any known facts
    return topicData.facts.some(fact => 
      statement.toLowerCase().includes(fact.toLowerCase().split(' ')[0])
    );
  }
  
  private createBlankInFact(fact: string, difficulty: string): {question: string, answer: string} {
    const words = fact.split(' ');
    let blankIndex: number;
    
    if (difficulty === 'easy') {
      blankIndex = words.length - 1; // Blank the last word
    } else if (difficulty === 'medium') {
      blankIndex = Math.floor(words.length / 2); // Blank middle word
    } else {
      blankIndex = 1; // Blank early word
    }
    
    const answer = words[blankIndex];
    words[blankIndex] = '___';
    
    return {
      question: words.join(' '),
      answer
    };
  }
  
  private generateExplanation(fact: string, concept: string): string {
    return `This relates to the concept that ${concept.toLowerCase()}. The fact states that ${fact.toLowerCase()}.`;
  }
  
  private generateDefinition(term: string, topicData: any): string {
    // Generate contextual definitions
    const definitions: {[key: string]: string} = {
      'Peninsula': 'A piece of land almost surrounded by water',
      'Archipelago': 'A group of islands',
      'Photosynthesis': 'Process by which plants make food using sunlight',
      'Mitosis': 'Cell division process',
      'Renaissance': 'Period of cultural rebirth in Europe',
      'Integer': 'Whole number that can be positive, negative, or zero'
    };
    
    return definitions[term] || `A key concept in this field of study`;
  }
  
  private explainRelationship(relationship: string, topicData: any): string {
    return `This relationship describes how different elements interact within the system`;
  }
  
  private generateComplexQuestion(topicData: any, index: number): string {
    return `Analyze the following scenario and determine the most likely outcome based on ${topicData.concepts[index % topicData.concepts.length]}`;
  }
  
  private generateComplexAnswer(topicData: any, index: number): string {
    return topicData.concepts[index % topicData.concepts.length];
  }
  
  private generateAnalyticalQuestion(topicData: any, index: number): string {
    return `Compare and contrast the following aspects: ${topicData.facts[index % topicData.facts.length]} and ${topicData.concepts[index % topicData.concepts.length]}`;
  }
  
  private generateAnalyticalAnswer(topicData: any, index: number): string {
    return `Analysis requires understanding both the factual information and conceptual framework`;
  }
  
  private categorizeQuestion(question: string): string {
    if (question.includes('What')) return 'Factual Recall';
    if (question.includes('Why') || question.includes('How')) return 'Conceptual Understanding';
    if (question.includes('Compare') || question.includes('Analyze')) return 'Analysis';
    return 'General Knowledge';
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private postProcessQuestions(questions: AIQuestion[], request: AIQuestionRequest): AIQuestion[] {
    // Ensure variety and quality
    const processed = [...questions];
    
    // Remove duplicates
    const unique = processed.filter((q, index, arr) => 
      arr.findIndex(q2 => q2.question === q.question) === index
    );
    
    // Balance difficulty distribution
    return this.balanceDifficulty(unique, request.difficulty);
  }
  
  private balanceDifficulty(questions: AIQuestion[], targetDifficulty: string): AIQuestion[] {
    // Ensure good mix of difficulties
    const difficulties = ['easy', 'medium', 'hard'];
    const target = difficulties.indexOf(targetDifficulty);
    
    return questions.map((q, index) => {
      // Create a natural progression
      if (index < questions.length * 0.3) return { ...q, difficulty: 'easy' };
      if (index < questions.length * 0.7) return { ...q, difficulty: 'medium' };
      return { ...q, difficulty: 'hard' };
    });
  }
}
