// AI Service for Quiz Generation
// This connects to actual AI APIs to generate questions

interface AIQuestionRequest {
  topic: string;
  questionCount: number;
  questionTypes: ('multiple-choice' | 'true-false' | 'short-answer')[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface AIQuestion {
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  points?: number;
}

export class AIService {
  private static instance: AIService;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  async generateQuestions(request: AIQuestionRequest): Promise<AIQuestion[]> {
    try {
      // For now, simulate AI generation with mock data
      // In production, you'd replace this with actual AI API calls
      const questions = await this.mockAIGeneration(request);
      return questions;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error('Failed to generate questions');
    }
  }
  
  private async mockAIGeneration(request: AIQuestionRequest): Promise<AIQuestion[]> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const questions: AIQuestion[] = [];
    const topic = request.topic.toLowerCase();
    
    for (let i = 0; i < request.questionCount; i++) {
      const questionType = request.questionTypes[i % request.questionTypes.length];
      
      switch (questionType) {
        case 'multiple-choice':
          questions.push(this.generateMultipleChoice(topic, i));
          break;
          
        case 'true-false':
          questions.push(this.generateTrueFalse(topic, i));
          break;
          
        case 'short-answer':
          questions.push(this.generateShortAnswer(topic, i));
          break;
          
        default:
          questions.push(this.generateMultipleChoice(topic, i));
      }
    }
    
    return questions;
  }
  
  private generateMultipleChoice(topic: string, index: number): AIQuestion {
    const questionTemplates = {
      geography: [
        `What is the capital of ${this.getRandomCountry()}?`,
        `Which continent is ${this.getRandomCountry()} located in?`,
        `What is ${this.getRandomCity()} famous for?`,
        `Name a major river in ${this.getRandomRegion()}?`
      ],
      science: [
        `What is the chemical symbol for ${this.getRandomElement()}?`,
        `What planet is known as the "Red Planet"?`,
        `What force causes objects to fall to Earth?`
      ],
      history: [
        `In which year did ${this.getRandomEvent()} occur?`,
        `Who was the ${this.getRandomPerson()} known for?`,
        `What was the main cause of ${this.getRandomWar()}?`
      ]
    };
    
    const template = questionTemplates[topic as keyof typeof questionTemplates]?.[index % questionTemplates[topic as keyof typeof questionTemplates]?.length] || 
      `Generate a question about ${topic}`;
    
    return {
      type: 'multiple-choice',
      question: template,
      options: this.generateOptions(),
      correctAnswer: Math.floor(Math.random() * 3) + 1,
      points: 10
    };
  }
  
  private generateTrueFalse(topic: string, index: number): AIQuestion {
    const statements = [
      `${this.getRandomCountry()} is a continent.`,
      `The Earth is flat.`,
      `${this.getRandomAnimal()} is a mammal.`,
      `Water freezes at 0 degrees Celsius.`,
      `The sun rises in the east.`
    ];
    
    return {
      type: 'true-false',
      question: statements[index % statements.length],
      correctAnswer: index % statements.length === 0 ? 'true' : 'false',
      points: 10
    };
  }
  
  private generateShortAnswer(topic: string, index: number): AIQuestion {
    const questions = [
      `What is the largest ${topic === 'geography' ? 'ocean' : 'animal'}?`,
      `Name the capital of ${this.getRandomCountry()}.`,
      `What year was ${this.getRandomEvent()}?`,
      `Who wrote "${this.getRandomBook()}"?`
    ];
    
    return {
      type: 'short-answer',
      question: questions[index % questions.length],
      correctAnswer: topic === 'geography' ? 'Pacific Ocean' : 'Leo Tolstoy',
      points: 10
    };
  }
  
  private generateOptions(): string[] {
    const options = [];
    const numOptions = 3 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numOptions; i++) {
      options.push(`Option ${String.fromCharCode(65 + i)}`);
    }
    
    return options;
  }
  
  private getRandomCountry(): string {
    const countries = ['France', 'Germany', 'Japan', 'Brazil', 'Canada', 'Australia'];
    return countries[Math.floor(Math.random() * countries.length)];
  }
  
  private getRandomCity(): string {
    const cities = ['Paris', 'Tokyo', 'New York', 'London', 'Sydney'];
    return cities[Math.floor(Math.random() * cities.length)];
  }
  
  private getRandomElement(): string {
    const elements = ['Oxygen', 'Carbon', 'Hydrogen', 'Nitrogen', 'Gold', 'Silver'];
    return elements[Math.floor(Math.random() * elements.length)];
  }
  
  private getRandomAnimal(): string {
    const animals = ['Elephant', 'Lion', 'Whale', 'Eagle', 'Dolphin'];
    return animals[Math.floor(Math.random() * animals.length)];
  }
  
  private getRandomEvent(): string {
    const events = ['World War II', 'Moon Landing', 'Industrial Revolution', 'American Revolution'];
    return events[Math.floor(Math.random() * events.length)];
  }
  
  private getRandomPerson(): string {
    const people = ['Albert Einstein', 'Marie Curie', 'Leonardo da Vinci', 'William Shakespeare'];
    return people[Math.floor(Math.random() * people.length)];
  }
  
  private getRandomWar(): string {
    const wars = ['American Civil War', 'World War I', 'Vietnam War', 'Korean War'];
    return wars[Math.floor(Math.random() * wars.length)];
  }
  
  private getRandomRegion(): string {
    const regions = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
    return regions[Math.floor(Math.random() * regions.length)];
  }
  
  private getRandomBook(): string {
    const books = ['War and Peace', '1984', 'The Great Gatsby', 'To Kill a Mockingbird'];
    return books[Math.floor(Math.random() * books.length)];
  }
}
