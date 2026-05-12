'use client';

import { useState } from 'react';
import { generateQuestion, evaluateAnswer, parseResume, generateResumeSummary } from '../actions';

interface Question {
  text: string;
  answer: string;
  feedback: string;
}

export default function InterviewApp() {
  const [jobRole, setJobRole] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState<string>('');
  const [resumeSummary, setResumeSummary] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const startInterview = async () => {
    if (!jobRole.trim()) return;
    setIsStarted(true);
    setIsLoading(true);
    try {
      const question = await generateQuestion(jobRole, [], resumeSummary);
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error generating question:', error);
      setCurrentQuestion('Sorry, there was an error generating a question. Please try again.');
    }
    setIsLoading(false);
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB.');
      return;
    }

    setResumeFile(file);
    setIsParsingResume(true);

    try {
      const content = await parseResume(file);
      setResumeContent(content);
      
      // Generate resume summary for better question targeting
      const summary = await generateResumeSummary(content);
      setResumeSummary(summary);
      
      alert('Resume uploaded and analyzed successfully! Questions will be tailored to your experience.');
    } catch (error) {
      console.error('Error parsing resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse the resume. Please try again with a different PDF.';
      alert(errorMessage);
      setResumeFile(null);
      setResumeContent('');
      // Reset the file input
      event.target.value = '';
    } finally {
      setIsParsingResume(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setIsLoading(true);
    try {
      const feedback = await evaluateAnswer(currentQuestion, userAnswer);
      const newQuestion: Question = {
        text: currentQuestion,
        answer: userAnswer,
        feedback,
      };
      setQuestions([...questions, newQuestion]);
      setUserAnswer('');
      setShowFeedback(true);
    } catch (error) {
      console.error('Error evaluating answer:', error);
    }
    setIsLoading(false);
  };

  const nextQuestion = async () => {
    setIsLoading(true);
    setShowFeedback(false);
    try {
      const previousQuestions = questions.map(q => q.text);
      const question = await generateQuestion(jobRole, previousQuestions, resumeSummary);
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error generating question:', error);
      setCurrentQuestion('Sorry, there was an error generating a question. Please try again.');
    }
    setIsLoading(false);
  };

  const resetInterview = () => {
    setJobRole('');
    setResumeFile(null);
    setResumeContent('');
    setResumeSummary('');
    setIsStarted(false);
    setCurrentQuestion('');
    setUserAnswer('');
    setQuestions([]);
    setShowFeedback(false);
    setQuestionIndex(0);
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-blue-400 mb-2">
              AI Interview App
            </h1>
            <p className="text-gray-300 text-lg">
              Practice smarter interviews with AI-powered feedback.
            </p>
          </div>
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Enter your job role (e.g., Software Engineer)"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
            />
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                📄 Optional: Upload your resume (PDF) for personalized questions
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                disabled={isLoading || isParsingResume}
                className="w-full p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
              />
              {isParsingResume && (
                <p className="text-blue-400 text-sm mt-2">
                  🔄 Parsing resume... This may take a few seconds.
                </p>
              )}
              {resumeFile && (
                <>
                  <p className="text-green-400 text-sm">
                    ✅ Resume uploaded: {resumeFile.name}
                  </p>
                  {resumeSummary && (
                    <div className="mt-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <p className="text-gray-300 text-sm font-medium mb-2">📋 Resume Summary:</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{resumeSummary}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <button
              onClick={startInterview}
              disabled={!jobRole.trim() || isLoading || isParsingResume}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Starting...</span>
                </div>
              ) : (
                'Start Interview'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <div>
            <h1 className="text-4xl font-bold text-slate-200">
              Interview for {jobRole}
            </h1>
            <p className="text-gray-400 mt-1">
              Question {questionIndex + 1}
              {resumeFile && <span className="ml-4 text-green-400">📄 Resume-based questions</span>}
            </p>
          </div>
          <button
            onClick={resetInterview}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            🔄 Reset
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={index} className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 hover:shadow-xl transition-all duration-200">
              <div className="flex items-start space-x-3 mb-4">
                <span className="text-2xl">❓</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-200 mb-2">Question {index + 1}:</h3>
                  <p className="text-gray-300 mb-4 leading-relaxed">{q.text}</p>
                  <h4 className="font-semibold text-gray-200 mb-2">💬 Your Answer:</h4>
                  <p className="text-gray-400 mb-4 bg-gray-700 p-4 rounded-lg leading-relaxed">{q.answer}</p>
                  <h4 className="font-semibold text-gray-200 mb-2">📊 AI Feedback:</h4>
                  <p className="text-gray-300 whitespace-pre-wrap bg-blue-900/30 p-4 rounded-lg border-l-4 border-blue-500 leading-relaxed">{q.feedback}</p>
                </div>
              </div>
            </div>
          ))}

          {currentQuestion && !showFeedback && (
            <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
              <div className="flex items-start space-x-3 mb-6">
                <span className="text-3xl">🎯</span>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-200 mb-3">Current Question:</h3>
                  <p className="text-gray-300 text-lg leading-relaxed mb-6">{currentQuestion}</p>
                  <div className="relative">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your thoughtful answer here..."
                      className="w-full p-4 border-2 border-gray-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-700 resize-none text-white placeholder-gray-400"
                      rows={6}
                    />
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <span className="text-gray-400">✍️</span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim() || isLoading}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        '✅ Submit Answer'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showFeedback && (
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start space-x-3">
                <span className="text-3xl">🎉</span>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-green-300 mb-3">AI Feedback on Your Answer:</h3>
                  <p className="text-green-200 whitespace-pre-wrap text-lg leading-relaxed mb-6 bg-gray-800 p-4 rounded-lg">{questions[questions.length - 1]?.feedback}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={nextQuestion}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Generating...</span>
                        </div>
                      ) : (
                        '➡️ Next Question'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
