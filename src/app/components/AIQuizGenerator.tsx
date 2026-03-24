import { useState, useCallback } from 'react';
import { Upload, FileText, Sparkles, X, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { AIService, AIQuestion } from '../lib/aiService';

interface AIQuizGeneratorProps {
  onQuestionsGenerated: (questions: ParsedQuestion[], title?: string) => void;
  onClose: () => void;
}

export function AIQuizGenerator({ onQuestionsGenerated, onClose }: AIQuizGeneratorProps) {
  const [content, setContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [detectedTitle, setDetectedTitle] = useState<string>('');

  const EXAMPLE_CONTENT = `General Knowledge Quiz

- What is the capital of France?
- London
- Paris ✅
- Berlin
- Madrid

- What is 2+2?
- 3
- 4 ✅
- 5
- 6

- Is the Earth flat?
- True
- False ✓

Q: Who painted the Mona Lisa?
A: Leonardo da Vinci

Q: What year did World War II end?
A: 1945`;

  const handleFileRead = useCallback((fileContent: string, fileName: string) => {
    setContent(fileContent);
    processContent(fileContent);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      // Check file type
      const validTypes = ['text/plain', 'text/markdown', 'application/json'];
      const isValidType = validTypes.includes(file.type) || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.md') ||
        file.name.endsWith('.json');

      if (!isValidType) {
        toast.error('Please upload a text, markdown, or JSON file');
        return;
      }

      if (file.size > 1024 * 1024) { // 1MB limit
        toast.error('File too large. Maximum size is 1MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleFileRead(content, file.name);
      };
      reader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleFileRead(content, file.name);
    };
    reader.readAsText(file);
  };

  const processContent = useCallback((text: string) => {
    setIsProcessing(true);
    setParseErrors([]);
    
    try {
      // Small delay to show processing state
      setTimeout(() => {
        // Try to parse as existing quiz content first
        const result = parseQuizContent(text);
        
        console.log('Parse result:', { 
          questionsFound: result.questions.length, 
          errors: result.errors,
          contentLength: text.length,
          firstLine: text.split('\n')[0]
        });
        
        if (result.errors.length > 0) {
          setParseErrors(result.errors);
        }
        
        if (result.questions.length > 0) {
          setPreviewQuestions(result.questions);
          setDetectedTitle(result.title || '');
          toast.success(`Parsed ${result.questions.length} questions!`);
        } else {
          // If no questions found, try AI generation
          handleGenerate();
        }
        
        setIsProcessing(false);
      }, 500);
    } catch (error) {
      console.error('Processing error:', error);
      setParseErrors(['Failed to process content']);
      setIsProcessing(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (content.trim().length === 0) {
      toast.error('Please enter a topic to generate questions about');
      return;
    }

    // Extract topic from content
    const topicMatch = content.match(/topic:\s*(.+)/i);
    const topic = topicMatch ? topicMatch[1] : content.trim().split('\n')[0] || 'General Knowledge';
    
    setIsProcessing(true);
    setParseErrors([]);
    
    try {
      const aiService = AIService.getInstance();
      const questions = await aiService.generateQuestions({
        topic,
        questionCount: 5,
        questionTypes: ['multiple-choice', 'true-false', 'short-answer'],
        difficulty: 'medium'
      });
      
      // Convert AI questions to ParsedQuestion format
      const parsedQuestions: ParsedQuestion[] = questions.map((q, index) => ({
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 10
      }));
      
      console.log('Generated questions:', parsedQuestions);
      setPreviewQuestions(parsedQuestions);
      setDetectedTitle(topic);
      toast.success(`Generated ${parsedQuestions.length} questions about ${topic}!`);
    } catch (error) {
      console.error('AI generation failed:', error);
      setParseErrors(['Failed to generate questions: ' + error.message]);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setContent(text);
        processContent(text);
      }
    } catch (error) {
      toast.error('Failed to read clipboard. Please paste manually.');
    }
  };

  const loadExample = () => {
    setContent(EXAMPLE_CONTENT);
    processContent(EXAMPLE_CONTENT);
    toast.info('Example quiz loaded and parsed successfully!');
  };

  // Auto-parse when user stops typing (debounced)
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Clear previous preview when editing
    if (previewQuestions.length > 0) {
      setPreviewQuestions([]);
      setParseErrors([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Quiz Generator
              </CardTitle>
              <CardDescription>
                Upload a file or paste content to automatically generate quiz questions
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-6 space-y-6">
          {/* Quick Start Guide */}
          {!content && !previewQuestions.length && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                🚀 Quick Start Guide
              </h3>
              <div className="space-y-2 text-sm text-purple-800">
                <p><strong>Option 1 (Easiest):</strong> Click the <strong>"Load Example"</strong> button below to see it in action!</p>
                <p><strong>Option 2:</strong> Copy this simple format and paste it in the text area:</p>
                <pre className="bg-white p-3 rounded border border-purple-200 text-xs mt-2">
{`- What is 2+2?
- 3
- 4 ✅
- 5`}
                </pre>
                <p><strong>Option 3:</strong> Drag & drop a .txt or .md file with your quiz content</p>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Drop your file here</h3>
            <p className="text-sm text-gray-600 mb-4">
              Supports .txt, .md, .json files (max 1MB)
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                <FileText className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <Button variant="outline" onClick={handlePaste}>
                Paste Content
              </Button>
              <Button 
                variant="default" 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={loadExample}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Load Example
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">💡 First time? Click "Load Example" to try it!</p>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.md,.json,text/plain,text/markdown"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">✨ Supported Formats:</h4>
            <div className="text-sm text-blue-800 space-y-3">
              <div>
                <strong>1. Markdown with bullets (recommended):</strong>
                <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
{`- What is 2+2?
- 3
- 4 ✅
- 5

- What is the capital of France?
- London
- Paris ✓
- Berlin`}
                </pre>
                <p className="text-xs mt-1 text-blue-700">Use ✅, ✓, or [x] to mark correct answers</p>
              </div>
              
              <div>
                <strong>2. Q&A Format:</strong>
                <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
{`Q: What is the capital of France?
A: Paris

Q: Is the Earth flat?
A: No`}
                </pre>
              </div>
              
              <div>
                <strong>3. Numbered List:</strong>
                <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
{`1. What is 2+2?
a) 3
b) 4 *
c) 5

2. What year was JavaScript created?
a) 1995 ✅
b) 2000`}
                </pre>
                <p className="text-xs mt-1 text-blue-700">Use *, ✅, or ✓ to mark correct answers</p>
              </div>

              <div>
                <strong>4. Simple Question List:</strong>
                <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
{`What is the capital of France?
Who invented the telephone?
When did World War II end?`}
                </pre>
                <p className="text-xs mt-1 text-blue-700">Creates short-answer questions (you can add answers later)</p>
              </div>
            </div>
          </div>

          {/* Text Input Area */}
          <div>
            <label className="block text-sm font-medium mb-2">Or paste content directly:</label>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Paste your quiz content here..."
              className="min-h-[150px] font-mono text-sm"
            />
            {content && (
              <Button
                onClick={() => processContent(content)}
                className="mt-2"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Generate Questions'}
              </Button>
            )}
          </div>

          {/* Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="w-full">
                  <h4 className="font-medium text-red-900 mb-1">Parsing Errors:</h4>
                  <ul className="text-sm text-red-800 list-disc list-inside mb-3">
                    {parseErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <div className="bg-white rounded p-3 border border-red-300">
                    <p className="text-sm font-medium text-red-900 mb-2">💡 Quick Tips:</p>
                    <ul className="text-xs text-red-800 space-y-1">
                      <li>• Click <strong>"Load Example"</strong> to see a working format</li>
                      <li>• Make sure questions have answers marked with ✅, ✓, or *</li>
                      <li>• Use one of the 4 supported formats shown above</li>
                      <li>• Each question needs at least 2 answer options</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewQuestions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">
                  Preview: {previewQuestions.length} Questions Generated
                </h4>
              </div>
              {detectedTitle && (
                <p className="text-sm text-green-800 mb-3">
                  <strong>Detected Title:</strong> {detectedTitle}
                </p>
              )}
              <div className="space-y-3 max-h-64 overflow-auto">
                {previewQuestions.map((q, i) => (
                  <div key={i} className="bg-white p-3 rounded border border-green-200">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">
                        {i + 1}. {q.question}
                      </p>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {q.type}
                      </span>
                    </div>
                    {q.options && (
                      <ul className="mt-2 space-y-1 text-sm text-gray-600">
                        {q.options.map((opt, j) => (
                          <li
                            key={j}
                            className={opt === q.correctAnswer ? 'text-green-700 font-medium' : ''}
                          >
                            • {opt} {opt === q.correctAnswer && '✓'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type === 'short-answer' && q.correctAnswer && (
                      <p className="mt-2 text-sm text-gray-600">
                        Answer: <span className="text-green-700 font-medium">{q.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        {previewQuestions.length > 0 && (
          <div className="border-t p-4 flex gap-2 justify-end bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Add {previewQuestions.length} Questions to Quiz
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}