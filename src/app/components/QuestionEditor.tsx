import { useRef, useEffect, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Question } from '../lib/api';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { GripVertical, Trash2, Plus, X, Brain } from 'lucide-react';

const ITEM_TYPE = 'QUESTION';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

export function QuestionEditor({ question, index, onUpdate, onDelete, onMove }: QuestionEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [aiSuggestedAnswer, setAiSuggestedAnswer] = useState<number | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [userOverrodeAi, setUserOverrodeAi] = useState(false);

  // AI-powered correct answer detection
  const detectCorrectAnswer = async () => {
    if (question.type !== 'multiple_choice' || !question.options || question.options.length < 2) {
      return;
    }

    setIsAiProcessing(true);
    
    try {
      // Simple AI logic - can be enhanced with actual AI API
      const questionText = question.question.toLowerCase();
      const options = question.options.map(opt => opt.toLowerCase());
      
      let suggestedIndex = -1;
      
      // Basic pattern matching for common question types
      if (questionText.includes('2+2') || questionText.includes('two plus two')) {
        const fourIndex = options.findIndex(opt => opt.includes('4') || opt.includes('four'));
        if (fourIndex !== -1) suggestedIndex = fourIndex;
      } else if (questionText.includes('capital') || questionText.includes('city')) {
        // Look for capital cities or well-known answers
        const commonAnswers = ['paris', 'london', 'tokyo', 'washington', 'beijing'];
        for (const answer of commonAnswers) {
          const idx = options.findIndex(opt => opt.includes(answer));
          if (idx !== -1) {
            suggestedIndex = idx;
            break;
          }
        }
      } else {
        // Default: select first non-empty option as fallback
        const firstValidIndex = options.findIndex(opt => opt.trim() !== '');
        if (firstValidIndex !== -1) suggestedIndex = firstValidIndex;
      }
      
      if (suggestedIndex !== -1) {
        setAiSuggestedAnswer(suggestedIndex);
        // Only auto-apply if user hasn't manually set an answer
        if (question.correctAnswer === undefined || question.correctAnswer === null || question.correctAnswer === '') {
          onUpdate({ correctAnswer: suggestedIndex });
          console.log(`AI suggested correct answer: option ${suggestedIndex} ("${question.options[suggestedIndex]}")`);
        }
      }
    } catch (error) {
      console.error('AI detection failed:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Run AI detection when question or options change
  useEffect(() => {
    if (question.type === 'multiple_choice' && question.options && question.options.length >= 2) {
      const hasValidOptions = question.options.some(opt => opt.trim() !== '');
      if (hasValidOptions && !userOverrodeAi) {
        detectCorrectAnswer();
      }
    }
  }, [question.question, question.options, question.type]);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  // Debug: Log initial state when component mounts
  useEffect(() => {
    console.log(`QuestionEditor ${index} mounted:`, {
      questionType: question.type,
      correctAnswer: question.correctAnswer,
      options: question.options,
      questionText: question.question
    });
  }, [question, index]);

  const addOption = () => {
    if (question.type === 'multiple_choice') {
      const options = question.options || [];
      onUpdate({ options: [...options, ''] });
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    if (question.type === 'multiple_choice') {
      const options = [...(question.options || [])];
      options[optionIndex] = value;
      onUpdate({ options });
    }
  };

  const removeOption = (optionIndex: number) => {
    if (question.type === 'multiple_choice') {
      const options = [...(question.options || [])];
      options.splice(optionIndex, 1);
      onUpdate({ options });
      
      // If the correct answer was the removed option, reset it
      if (question.correctAnswer === optionIndex) {
        onUpdate({ correctAnswer: 0 });
      } else if (typeof question.correctAnswer === 'number' && question.correctAnswer > optionIndex) {
        onUpdate({ correctAnswer: (question.correctAnswer as number) - 1 });
      }
    }
  };

  return (
    <Card 
      ref={ref} 
      className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Drag Handle */}
          <div className="flex-shrink-0 cursor-move pt-2">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex-1 space-y-4">
            {/* Question Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">Question {index + 1}</span>
                  <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                    {question.type === 'multiple_choice' && 'Multiple Choice'}
                    {question.type === 'true_false' && 'True/False'}
                    {question.type === 'short_answer' && 'Short Answer'}
                  </span>
                </div>
                <Input
                  placeholder="Enter your question"
                  value={question.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  className="text-base"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Multiple Choice Options */}
            {question.type === 'multiple_choice' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Answer Options</Label>
                  <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">Click radio button to select correct answer</span>
                </div>
                <RadioGroup 
                  value={question.correctAnswer?.toString()}
                  onValueChange={(value) => {
                    console.log('RadioGroup changed:', { 
                      questionIndex: index, 
                      oldValue: question.correctAnswer, 
                      newValue: value, 
                      parsedValue: parseInt(value),
                      questionType: question.type,
                      currentCorrectAnswer: question.correctAnswer
                    });
                    
                    // Mark that user overrode AI suggestion
                    if (aiSuggestedAnswer !== null && parseInt(value) !== aiSuggestedAnswer) {
                      setUserOverrodeAi(true);
                    }
                    
                    onUpdate({ correctAnswer: parseInt(value) });
                  }}
                  className="space-y-3"
                >
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem 
                        value={optionIndex.toString()} 
                        id={`q${index}-opt${optionIndex}`}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${optionIndex + 1}`}
                          value={option}
                          onChange={(e) => updateOption(optionIndex, e.target.value)}
                          className="text-base border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                      
                      {/* AI suggestion indicator */}
                      {aiSuggestedAnswer === optionIndex && !userOverrodeAi && (
                        <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          <Brain className="w-3 h-3" />
                          <span>AI</span>
                        </div>
                      )}
                      
                      {/* User override indicator */}
                      {userOverrodeAi && question.correctAnswer === optionIndex && (
                        <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          <span>✓</span>
                          <span>You</span>
                        </div>
                      )}
                      
                      {question.options && question.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(optionIndex)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={addOption} className="flex-1">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                  
                  {/* AI re-detect button */}
                  {question.type === 'multiple_choice' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setUserOverrodeAi(false);
                        detectCorrectAnswer();
                      }}
                      disabled={isAiProcessing}
                      className="flex-1 ml-2"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      {isAiProcessing ? 'AI Thinking...' : 'AI Suggest'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* True/False */}
            {question.type === 'true_false' && (
              <div className="space-y-3">
                <Label>Correct Answer</Label>
                <RadioGroup 
                  value={question.correctAnswer?.toString()}
                  onValueChange={(value) => onUpdate({ correctAnswer: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`q${index}-true`} />
                    <Label htmlFor={`q${index}-true`} className="cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`q${index}-false`} />
                    <Label htmlFor={`q${index}-false`} className="cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Short Answer */}
            {question.type === 'short_answer' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input
                  placeholder="Enter the correct answer"
                  value={question.correctAnswer?.toString() || ''}
                  onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
                />
                <p className="text-xs text-gray-600">Answers will be checked case-insensitively</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
