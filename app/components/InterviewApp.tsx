'use client';

import { useState } from 'react';
import {
  compareResumeToJob,
  type ResumeComparison,
} from '../actions';

type PdfTextItem = {
  str: string;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: unknown[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsModule = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (source: { data: ArrayBuffer }) => {
    promise: Promise<PdfDocument>;
  };
};

async function parseResumePdf(file: File): Promise<string> {
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is PdfTextItem => typeof item === 'object' && item !== null && 'str' in item)
      .map((item) => item.str)
      .join(' ');
    fullText += `${pageText}\n`;
  }

  const cleanedText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  if (cleanedText.length < 50) {
    throw new Error('The PDF contains very little readable text. Please upload a text-based resume PDF.');
  }

  return cleanedText;
}

export default function InterviewApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [comparison, setComparison] = useState<ResumeComparison | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    const isValid = email.trim().toLowerCase() === 'hr@example.com' && password === 'password123';
    if (!isValid) {
      setLoginError('Invalid HR credentials. Try hr@example.com / password123 for local testing.');
      return;
    }

    setIsLoggedIn(true);
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
    setComparison(null);

    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF resume.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Resume file size must be less than 10MB.');
      event.target.value = '';
      return;
    }

    setResumeFile(file);
    setIsParsingResume(true);

    try {
      const content = await parseResumePdf(file);
      setResumeContent(content);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to parse this resume.';
      setError(message);
      setResumeFile(null);
      setResumeContent('');
      event.target.value = '';
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleCompare = async () => {
    setError('');
    setComparison(null);

    if (!resumeContent) {
      setError('Upload a resume before running the comparison.');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Paste a job description before running the comparison.');
      return;
    }

    setIsComparing(true);
    try {
      const result = await compareResumeToJob(resumeContent, jobDescription);
      setComparison(result);
    } catch (compareError) {
      const message = compareError instanceof Error ? compareError.message : 'Comparison failed.';
      setError(message);
    } finally {
      setIsComparing(false);
    }
  };

  const resetReview = () => {
    setResumeFile(null);
    setResumeContent('');
    setJobDescription('');
    setComparison(null);
    setError('');
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
          <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <section className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                HR Assistant
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-bold leading-tight text-white md:text-6xl">
                  Screen resumes against job descriptions with AI support.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300">
                  Upload a candidate resume, paste the role requirements, and get a clear fit score,
                  skill match, gaps, and interview prompts for the hiring conversation.
                </p>
              </div>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                {['Fit score', 'Skill gaps', 'Interview prompts'].map((item) => (
                  <div key={item} className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                    <p className="text-sm font-medium text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <form
              onSubmit={handleLogin}
              className="rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white">HR Login</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Use the local demo credentials unless environment credentials are configured.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="hr@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="password123"
                  />
                </label>
              </div>

              {loginError && (
                <p className="mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
              HR Assistant
            </p>
            <h1 className="mt-2 text-4xl font-bold text-white">Candidate Match Review</h1>
            <p className="mt-2 text-slate-400">
              Compare a resume with a job description and prepare a more focused shortlist.
            </p>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="w-fit rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Sign Out
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Candidate Resume</h2>
              <p className="mt-1 text-sm text-slate-400">Upload a text-based PDF resume.</p>

              <label className="mt-5 block rounded-lg border border-dashed border-slate-600 bg-slate-800 p-5 transition hover:border-cyan-400">
                <span className="block text-sm font-medium text-slate-200">Resume PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  disabled={isParsingResume || isComparing}
                  className="mt-3 w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-cyan-300 disabled:opacity-50"
                />
              </label>

              {isParsingResume && (
                <p className="mt-3 text-sm text-cyan-300">Parsing resume...</p>
              )}

              {resumeFile && resumeContent && (
                <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/60 p-4">
                  <p className="text-sm font-medium text-emerald-200">Resume ready</p>
                  <p className="mt-1 truncate text-sm text-emerald-300">{resumeFile.name}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Job Description</h2>
              <p className="mt-1 text-sm text-slate-400">
                Paste the role summary, responsibilities, and required skills.
              </p>
              <textarea
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value);
                  setComparison(null);
                }}
                rows={12}
                className="mt-4 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Paste job description here..."
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCompare}
                disabled={isParsingResume || isComparing || !resumeContent || !jobDescription.trim()}
                className="flex-1 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isComparing ? 'Comparing...' : 'Compare Candidate'}
              </button>
              <button
                onClick={resetReview}
                className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            {!comparison ? (
              <div className="flex min-h-[620px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
                <div className="max-w-md">
                  <h2 className="text-2xl font-semibold text-white">Ready for review</h2>
                  <p className="mt-3 text-slate-400">
                    Add a resume and job description to generate an AI-assisted match analysis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="rounded-lg border border-cyan-800 bg-cyan-950/50 p-5 text-center">
                    <p className="text-sm font-medium text-cyan-200">Fit Score</p>
                    <p className="mt-3 text-5xl font-bold text-cyan-300">
                      {comparison.overallScore}
                    </p>
                    <p className="mt-1 text-sm text-cyan-200">out of 100</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
                      Recommendation
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      {comparison.recommendation}
                    </h2>
                    <p className="mt-3 leading-7 text-slate-300">{comparison.summary}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ResultList title="Strengths" items={comparison.strengths} tone="green" />
                  <ResultList title="Gaps" items={comparison.gaps} tone="amber" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SkillPanel title="Matched Skills" skills={comparison.matchedSkills} />
                  <SkillPanel title="Missing Skills" skills={comparison.missingSkills} muted />
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-lg font-semibold text-white">Suggested Interview Questions</h3>
                  <ol className="mt-4 space-y-3">
                    {comparison.interviewQuestions.map((question, index) => (
                      <li key={question} className="flex gap-3 text-sm leading-6 text-slate-300">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                          {index + 1}
                        </span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'green' | 'amber';
}) {
  const toneClass = tone === 'green' ? 'border-emerald-800 text-emerald-200' : 'border-amber-800 text-amber-200';

  return (
    <div className={`rounded-lg border bg-slate-950 p-5 ${toneClass}`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="text-sm leading-6 text-slate-300">
              {item}
            </li>
          ))
        ) : (
          <li className="text-sm text-slate-500">No items returned.</li>
        )}
      </ul>
    </div>
  );
}

function SkillPanel({
  title,
  skills,
  muted = false,
}: {
  title: string;
  skills: string[];
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => (
            <span
              key={skill}
              className={`rounded-full border px-3 py-1 text-sm ${
                muted
                  ? 'border-slate-700 bg-slate-900 text-slate-300'
                  : 'border-cyan-800 bg-cyan-950/60 text-cyan-200'
              }`}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No skills returned.</span>
        )}
      </div>
    </div>
  );
}
