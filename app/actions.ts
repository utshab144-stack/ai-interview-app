import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateQuestion(jobRole: string, previousQuestions: string[] = []) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Generate one thoughtful interview question for a ${jobRole} position. Make it relevant to the role and avoid repeating these previous questions: ${previousQuestions.join(', ')}. Keep it concise.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('API Error:', error);
    // Fallback mock questions
    const mockQuestions = [
      `Can you tell me about a challenging project you've worked on as a ${jobRole}?`,
      `What are your strengths and weaknesses in the context of ${jobRole} role?`,
      `How do you stay updated with the latest trends in ${jobRole} field?`,
      `Describe a situation where you had to solve a problem under pressure.`,
      `Why are you interested in this ${jobRole} position?`
    ];
    const availableQuestions = mockQuestions.filter(q => !previousQuestions.some(pq => q.includes(pq.split(' ').slice(0, 5).join(' '))));
    return availableQuestions.length > 0 ? availableQuestions[0] : mockQuestions[0];
  }
}

export async function evaluateAnswer(question: string, answer: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Evaluate this interview answer. Question: "${question}". Answer: "${answer}". Provide constructive feedback, a score out of 10, and suggestions for improvement. Keep it brief.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('API Error:', error);
    // Fallback mock feedback with score based on answer quality
    const answerLength = answer.trim().length;
    const wordCount = answer.trim().split(/\s+/).length;
    const hasDetails = /example|specific|because|reason|result|impact|learned/i.test(answer);
    const hasFullSentences = /[.!?]/.test(answer);
    
    let score = 0;
    let feedback = '';

    // Score calculation
    if (answerLength < 20) {
      score = 2;
      feedback = 'Your answer is too brief. Provide more details and examples to support your response.';
    } else if (answerLength < 50) {
      score = 3;
      feedback = 'Your answer is quite short. Try to expand with more specific examples and details.';
    } else if (wordCount < 10) {
      score = 4;
      feedback = 'Your answer needs more substance. Add concrete examples and explain your thinking process.';
    } else if (!hasFullSentences) {
      score = 5;
      feedback = 'Use proper sentence structure and punctuation. Your answer is hard to follow.';
    } else if (!hasDetails) {
      score = 6;
      feedback = 'Good start, but your answer lacks specific examples. Try to include concrete situations or outcomes.';
    } else if (wordCount < 30) {
      score = 7;
      feedback = 'Nice answer with some good details. Could be stronger with more specific examples or metrics.';
    } else if (wordCount < 60) {
      score = 8;
      feedback = 'Good response with relevant details and examples. Consider adding the impact or result.';
    } else {
      score = 9;
      feedback = 'Excellent answer! You provided clear examples, explained your reasoning, and showed strong communication.';
    }

    return `Feedback: ${feedback}\n\nScore: ${score}/10\n\nSuggestion: ${score < 7 ? 'Focus on providing specific examples and detailed explanations.' : 'Keep up the good work! Practice elaborating on outcomes and measurable results.'}`;
  }
}