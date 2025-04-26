import Head from 'next/head';
import { useState } from 'react';
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import { convertYamlToDagger } from "../src/lib/convert";
import { ChevronDownIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import path from 'path';
import fs from 'fs';

const MonacoEditor = dynamic(() => import("../src/components/Editor"), { ssr: false });

const DOC_LINKS = {
  go: "https://docs.dagger.io/sdk/go/",
  python: "https://docs.dagger.io/sdk/python/",
  typescript: "https://docs.dagger.io/sdk/typescript/",
};

interface Props {
  basicYaml: string;
  intermediateYaml: string;
  gnarlyYaml: string;
}

export default function Home({ basicYaml, intermediateYaml, gnarlyYaml }: Props) {
  const [yaml, setYaml] = useState<string>('');
  const [language, setLanguage] = useState<'go' | 'python' | 'typescript'>("go");
  const [code, setCode] = useState("");
  const [locSaved, setLocSaved] = useState<number | null>(null);
  const [yamlLoc, setYamlLoc] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleShred() {
    setLoading(true);
    setError("");
    const yamlLines = yaml.trim().split("\n").length;
    setYamlLoc(yamlLines);
    const { code: daggerCode, error: convertError } = await convertYamlToDagger({ yamlStr: yaml, language });
    if (convertError) {
      setError(`Conversion failed: ${convertError}`); // Display the actual error
      setLoading(false);
      return;
    }
    const codeLines = daggerCode.trim().split("\n").length;
    setCode(daggerCode);
    setLocSaved(yamlLines - codeLines);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setLoading(false);
  }

  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function insertSample(type: 'basic' | 'intermediate' | 'gnarly') {
    if (type === 'basic') setYaml(basicYaml);
    else if (type === 'intermediate') setYaml(intermediateYaml);
    else if (type === 'gnarly') setYaml(gnarlyYaml);
  }

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLanguage(e.target.value as 'go' | 'python' | 'typescript');
  }

  return (
    <div>
      <Head>
        <title>YAML Shredder</title>
      </Head>
      <main style={{ minHeight: '100vh', background: '#f6f4ef' }}>
        {/* Hero Section */}
        <section className="dagger-hero" style={{ color: '#191826', borderRadius: '0 0 32px 32px', padding: '32px 0 14px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 6, letterSpacing: '-1px', color: '#191826' }}>YAML Shredder</h1>
          <p style={{ fontSize: 20, fontWeight: 400, color: '#191826', margin: 0 }}>Paste a GitHub Actions YAML and get beautiful, minimal Dagger code instantly.</p>
        </section>

        {/* Main Card with Editors */}
        <section className="dagger-card" style={{ maxWidth: '96vw', width: '96vw', margin: '28px auto 0 auto', padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 12px 1fr', gap: 0, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', paddingRight: 12, width: '100%' }}>
              {/* Insert Sample Section */}
              <div className="mt-4 text-sm text-gray-500">
                Insert sample:{" "}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); insertSample('basic'); }}
                  className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-200 mr-2 mb-2"
                >
                  Basic Node.js CI
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); insertSample('intermediate'); }}
                  className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-200 mr-2 mb-2"
                >
                  Intermediate Python Package CI
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); insertSample('gnarly'); }}
                  className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-purple-200 mr-2 mb-2"
                >
                  Gnarly Monorepo CI/CD
                </a>
              </div>
              <label style={{ marginBottom: 6, fontWeight: 700, fontSize: 18 }}>GitHub Actions YAML</label>
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <MonacoEditor
                  height="520px"
                  width="100%"
                  language="yaml"
                  value={yaml}
                  onChange={setYaml}
                  options={{ minimap: { enabled: false }, fontSize: 17, fontFamily: 'Fira Mono, monospace' }}
                />
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: 'linear-gradient(to bottom, #e6e3db 20%, transparent 100%)', margin: '0 6px', height: '90%', alignSelf: 'center', borderRadius: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', paddingLeft: 12, width: '100%', marginTop: 44 }}>
              <label style={{ marginBottom: 6, fontWeight: 700, fontSize: 18 }}>Dagger ({language})</label>
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <MonacoEditor
                  height="520px"
                  width="100%"
                  language={language === 'go' ? 'go' : language === 'python' ? 'python' : 'typescript'}
                  value={code}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 17, fontFamily: 'Fira Mono, monospace' }}
                />
              </div>
            </div>
          </div>
          {/* Action Buttons Section */}
          <div className="dagger-actions flex items-center gap-4 mt-8 flex-wrap">
            {/* Language Selection Dropdown */}
            <div className="relative inline-block">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="rounded border border-sky-200 px-5 py-2 text-base bg-sky-50 text-sky-700 font-semibold transition hover:border-sky-400 focus:border-sky-400 focus:outline-none appearance-none pr-8"
              >
                <option value="go">Go</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-sky-700">
                <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            {/* Shred Button */}
            <button
              onClick={handleShred}
              disabled={loading || !yaml.trim()}
              className="rounded border-none bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-gradient-to-r hover:from-sky-700 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Shredding..." : "Shred it"}
            </button>
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={!code.trim()}
              className={`flex items-center justify-center rounded border border-sky-200 bg-sky-50 px-6 py-2 text-base font-semibold text-sky-600 shadow-sm transition hover:bg-sky-200 hover:text-sky-800 disabled:opacity-50 disabled:cursor-not-allowed ${copied ? ' bg-green-100 text-green-800 border-green-300 hover:bg-green-200' : ''}`}
            >
              <ClipboardDocumentIcon className={`h-5 w-5 mr-2 ${copied ? 'text-green-800' : 'text-sky-600'}`} />
              <span>{copied ? 'Copied!' : 'Copy Dagger code'}</span>
            </button>
            <a href={DOC_LINKS[language]} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-sky-600 underline hover:text-sky-800 ml-2 self-center">Dagger docs</a>
          </div>
          {/* LOC Saved and Error Feedback */}
          {typeof locSaved === "number" && yamlLoc && yamlLoc > 0 && (
            <div style={{ marginTop: 20, textAlign: 'center', fontWeight: 700, color: '#22c55e', fontSize: 20 }}>{Math.abs(locSaved)} LOC saved! ({Math.round((locSaved / yamlLoc) * 100)}% of original)</div>
          )}

          {/* Estimated Dagger Run Time */}
          {code && (
            (() => {
              // Simple step heuristics for Go, Python, TypeScript
              let numSteps = 0;
              if (language === 'go') {
                numSteps = (code.match(/dag\.Pipeline\(|dag\.Container\(/g) || []).length;
              } else if (language === 'python') {
                numSteps = (code.match(/client\.pipeline\(|client\.container\(/g) || []).length;
              } else if (language === 'typescript') {
                numSteps = (code.match(/client\.pipeline\(|client\.container\(/g) || []).length;
              }
              const estimatedTime = 2 + numSteps * 2;
              return (
                <>
                  <div style={{ marginTop: 10, textAlign: 'center', fontWeight: 600, color: '#191826', fontSize: 17 }}>
                    Estimated Dagger run time: ~{estimatedTime} seconds
                  </div>
                  <div style={{ marginTop: 2, textAlign: 'center', fontWeight: 500, color: '#64748b', fontSize: 15 }}>
                    Dagger has built-in caching, so repeat runs will be even faster.
                  </div>
                </>
              );
            })()
          )}
          {error && (
            <div className="dagger-error" style={{ marginTop: 14, fontSize: 17 }}>{error}</div>
          )}
        </section>
        <footer className="dagger-footer">
          <a href="https://github.com/gkogan/yaml-shredder" target="_blank" rel="noopener noreferrer">View on GitHub</a>
        </footer>
      </main>
    </div>
  );
}

export async function getStaticProps() {
  const samplesDir = path.join(process.cwd(), 'samples'); // Use path.join for cross-platform compatibility

  const basicYamlPath = path.join(samplesDir, 'basic.yaml');
  const intermediateYamlPath = path.join(samplesDir, 'intermediate.yaml');
  const gnarlyYamlPath = path.join(samplesDir, 'gnarly.yaml');

  // Use fs.readFile to read the file content as strings
  const basicYaml = await fs.promises.readFile(basicYamlPath, 'utf8');
  const intermediateYaml = await fs.promises.readFile(intermediateYamlPath, 'utf8');
  const gnarlyYaml = await fs.promises.readFile(gnarlyYamlPath, 'utf8');

  return {
    props: {
      // Pass the string content directly
      basicYaml,
      intermediateYaml,
      gnarlyYaml,
    },
  };
}
