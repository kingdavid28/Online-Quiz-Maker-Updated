import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, Question } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Search, 
  Plus, 
  Filter,
  BookOpen,
  Clock,
  Star,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface QuestionBankBrowserProps {
  onQuestionsSelected: (questions: Question[]) => void;
  maxQuestions?: number;
}

export function QuestionBankBrowser({ onQuestionsSelected, maxQuestions = 20 }: QuestionBankBrowserProps) {
  const { accessToken } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  // Load questions from bank
  useEffect(() => {
    if (accessToken && isOpen) {
      loadQuestions();
    }
  }, [accessToken, isOpen]);

  // Filter questions based on search and type
  useEffect(() => {
    let filtered = questions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(q => q.type === selectedType);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedType]);

  const loadQuestions = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const bankQuestions = await api.getQuestions(accessToken);
      setQuestions(bankQuestions);
    } catch (error) {
      toast.error('Failed to load question bank');
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    if (!questionId) return; // Safety check for undefined/null
    
    const newSelected = new Set(selectedQuestions);
    
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else if (newSelected.size < maxQuestions) {
      newSelected.add(questionId);
    } else {
      toast.error(`Maximum ${maxQuestions} questions allowed`);
      return;
    }
    
    setSelectedQuestions(newSelected);
  };

  const handleAddSelectedQuestions = () => {
    const selectedQs = questions.filter(q => q.id && selectedQuestions.has(q.id));
    onQuestionsSelected(selectedQs);
    setSelectedQuestions(new Set());
    setIsOpen(false);
    toast.success(`Added ${selectedQs.length} questions to quiz`);
  };

  const getQuestionTypeBadge = (type: string) => {
    const colors = {
      'multiple_choice': 'bg-blue-100 text-blue-800',
      'true_false': 'bg-green-100 text-green-800',
      'short_answer': 'bg-purple-100 text-purple-800'
    };
    
    const labels = {
      'multiple_choice': 'Multiple Choice',
      'true_false': 'True/False',
      'short_answer': 'Short Answer'
    };

    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <BookOpen className="w-4 h-4 mr-2" />
          Browse Question Bank
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Question Bank Browser
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by question text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Label htmlFor="type-filter">Filter by Type</Label>
              <select
                id="type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedQuestions.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedQuestions.size} of {maxQuestions} questions selected
                </span>
                <Button onClick={handleAddSelectedQuestions} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Quiz
                </Button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchTerm || selectedType !== 'all' 
                    ? 'No questions found matching your criteria' 
                    : 'No questions in your bank yet'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((question, index) => (
                <Card key={question.id || `question-${index}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={question.id ? selectedQuestions.has(question.id) : false}
                        onCheckedChange={() => question.id && toggleQuestionSelection(question.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getQuestionTypeBadge(question.type)}
                          {question.points && (
                            <Badge variant="outline" className="text-xs">
                              {question.points} pts
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                          {question.question}
                        </h4>
                        
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {question.options.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span className="line-clamp-1">{option}</span>
                                {question.correctAnswer === index && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'true_false' && (
                          <div className="text-sm text-gray-600">
                            Correct Answer: <span className="font-medium">
                              {question.correctAnswer === 'true' ? 'True' : 'False'}
                            </span>
                          </div>
                        )}
                        
                        {question.type === 'short_answer' && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Answer:</span> {question.correctAnswer}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
