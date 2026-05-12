import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateResumeSummary(resumeContent: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Create a concise summary of this resume, highlighting the candidate's key skills, experience, education, and notable achievements. Keep it under 300 words and focus on information relevant for job interviews.

Resume content:
${resumeContent.substring(0, 3000)}`; // Limit to first 3000 chars

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating resume summary:', error);
    // Fallback: return first 500 characters of resume as summary
    return resumeContent.substring(0, 500) + (resumeContent.length > 500 ? '...' : '');
  }
}

export async function parseResume(file: File): Promise<string> {
  try {
    // Dynamically import the legacy browser build of pdfjs-dist
    // @ts-ignore
    const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as any;

    // Set the worker source to the local public worker file
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .filter((item: any): item is TextItem => 'str' in item)
        .map((item) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Clean up the text
    const cleanedText = fullText
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    if (cleanedText.length < 50) {
      throw new Error('The PDF appears to contain very little text. Please ensure it contains readable text content. If you are uploading a scanned resume, use a text-based PDF instead.');
    }

    return cleanedText;
  } catch (error) {
    console.error('Error parsing PDF:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('InvalidPDFException')) {
        throw new Error('The uploaded file is not a valid PDF. Please upload a valid PDF file.');
      }
      if (message.includes('MissingPDFException')) {
        throw new Error('The PDF file appears to be corrupted. Please try with a different PDF file.');
      }
      if (message.includes('UnexpectedResponseException')) {
        throw new Error('Unable to read the PDF file. Please ensure the file is not password-protected and try again.');
      }
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        throw new Error('Unable to load the PDF worker. Please refresh the page and try again.');
      }
    }

    throw new Error('Failed to parse resume PDF. Please ensure it\'s a valid text-based PDF resume, not a scanned image-only PDF.');
  }
}

export async function generateQuestion(jobRole: string, previousQuestions: string[] = [], resumeContent?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let prompt = `Generate one thoughtful interview question for a ${jobRole} position. Make it relevant to the role and avoid repeating these previous questions: ${previousQuestions.join(', ')}. Keep it concise.`;

    if (resumeContent) {
      prompt = `Based on this resume summary, generate one thoughtful interview question for a ${jobRole} position that references the candidate's actual experience, skills, projects, or achievements mentioned in the summary. Make the question specific to their background and avoid generic questions. Avoid repeating these previous questions: ${previousQuestions.join(', ')}. Keep it concise.

Resume Summary:
${resumeContent}`; // resumeContent is now the summary
    }

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