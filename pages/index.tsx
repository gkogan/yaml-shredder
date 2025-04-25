import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { useState } from "react";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import { convertYamlToDagger } from "../src/lib/convert";

const MonacoEditor = dynamic(() => import("../src/components/Editor"), { ssr: false });

const DOC_LINKS = {
  go: "https://docs.dagger.io/sdk/go/",
  python: "https://docs.dagger.io/sdk/python/",
  typescript: "https://docs.dagger.io/sdk/typescript/",
};

export default function Home() {
  const [yaml, setYaml] = useState("");
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
    if (type === 'basic') setYaml(samples.basic);
    else if (type === 'intermediate') setYaml(samples.intermediate);
    else if (type === 'gnarly') setYaml(samples.gnarly);
  }

  const samples = {
    basic: 'name: Basic Node.js CI (Verbose)\n\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n    branches: [main, develop]\n  workflow_dispatch:\n  schedule:\n    - cron: \'0 2 * * 0\'\n\njobs:\n  setup:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout code\n        uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: \'20\'\n      - name: Cache node modules\n        uses: actions/cache@v4\n        with:\n          path: ~/.npm\n          key: ${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\') }}\n          restore-keys: |\n            ${{ runner.os }}-node-\n      - name: Install dependencies\n        run: npm ci\n      - name: Install dev dependencies\n        run: npm install --only=dev\n  lint:\n    runs-on: ubuntu-latest\n    needs: setup\n    steps:\n      - name: Lint code\n        run: npm run lint\n      - name: Lint docs\n        run: npm run lint:docs\n  test:\n    runs-on: ubuntu-latest\n    needs: [setup, lint]\n    steps:\n      - name: Run unit tests\n        run: npm run test:unit\n      - name: Run integration tests\n        run: npm run test:integration\n      - name: Upload test results\n        uses: actions/upload-artifact@v4\n        with:\n          name: test-results\n          path: test-results/\n      - name: Upload coverage report\n        uses: actions/upload-artifact@v4\n        with:\n          name: coverage-xml\n          path: coverage.xml\n  build:\n    runs-on: ubuntu-latest\n    needs: [lint, test]\n    steps:\n      - name: Build project\n        run: npm run build\n      - name: Upload build artifact\n        uses: actions/upload-artifact@v4\n        with:\n          name: dist\n          path: dist/\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Deploy to production\n        run: ./scripts/deploy.sh\n      - name: Notify Slack\n        uses: slackapi/slack-github-action@v1\n        with:\n          payload: \'{"text":"Production deploy completed!"}\'\n      - name: Create GitHub Release\n        uses: softprops/action-gh-release@v1\n        with:\n          files: dist/**\n  notify:\n    runs-on: ubuntu-latest\n    needs: [deploy]\n    steps:\n      - name: Send notification\n        run: echo "Full pipeline finished."\n',
    intermediate: 'name: Python Package CI (Verbose)\n\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n    branches: [main, develop]\n  schedule:\n    - cron: \'0 0 * * 0\'\n\njobs:\n  setup:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout code\n        uses: actions/checkout@v4\n      - name: Set up Python\n        uses: actions/setup-python@v4\n        with:\n          python-version: \'3.11\'\n      - name: Cache pip\n        uses: actions/cache@v4\n        with:\n          path: ~/.cache/pip\n          key: ${{ runner.os }}-pip-${{ hashFiles(\'**/requirements.txt\') }}\n          restore-keys: |\n            ${{ runner.os }}-pip-\n      - name: Install dependencies\n        run: pip install -r requirements.txt\n      - name: Install dev dependencies\n        run: pip install -r dev-requirements.txt\n  format:\n    runs-on: ubuntu-latest\n    needs: setup\n    steps:\n      - name: Format code\n        run: black --check src/\n  lint:\n    runs-on: ubuntu-latest\n    needs: setup\n    steps:\n      - name: Lint code\n        run: flake8 src/\n      - name: Type check\n        run: mypy src/\n  test:\n    runs-on: ubuntu-latest\n    needs: [setup, lint]\n    steps:\n      - name: Run tests\n        run: pytest --cov=src/ --cov-report=xml\n      - name: Upload coverage report\n        uses: actions/upload-artifact@v4\n        with:\n          name: coverage-xml\n          path: coverage.xml\n      - name: Upload test results\n        uses: actions/upload-artifact@v4\n        with:\n          name: test-results\n          path: .pytest_cache/\n  build:\n    runs-on: ubuntu-latest\n    needs: test\n    steps:\n      - name: Build package\n        run: python setup.py sdist bdist_wheel\n      - name: Upload dist\n        uses: actions/upload-artifact@v4\n        with:\n          name: dist\n          path: dist/\n      - name: Publish package\n        run: twine upload dist/*\n  release:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Create GitHub Release\n        uses: softprops/action-gh-release@v1\n        with:\n          files: dist/**\n  notify:\n    runs-on: ubuntu-latest\n    needs: [release]\n    steps:\n      - name: Notify team\n        run: echo "Release pipeline finished."\n',
    gnarly: 'name: Monorepo CI/CD (Verbose)\n\non:\n  push:\n    branches: [main, develop, staging, release]\n  pull_request:\n    branches: [main, develop, staging]\n  workflow_dispatch:\n  schedule:\n    - cron: \'0 1 * * 1\'\n\njobs:\n  install:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout repository\n        uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: \'20\'\n      - name: Cache node modules\n        uses: actions/cache@v4\n        with:\n          path: ~/.npm\n          key: ${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\') }}\n          restore-keys: |\n            ${{ runner.os }}-node-\n      - name: Install dependencies\n        run: npm ci\n  lint:\n    runs-on: ubuntu-latest\n    needs: install\n    steps:\n      - name: Lint code\n        run: npm run lint\n      - name: Lint docs\n        run: npm run lint:docs\n  test:\n    runs-on: ubuntu-latest\n    needs: install\n    steps:\n      - name: Run unit tests\n        run: npm run test:unit\n      - name: Run integration tests\n        run: npm run test:integration\n      - name: Upload test results\n        uses: actions/upload-artifact@v4\n        with:\n          name: test-results\n          path: test-results/\n      - name: Upload coverage report\n        uses: actions/upload-artifact@v4\n        with:\n          name: coverage-xml\n          path: coverage.xml\n  build:\n    runs-on: ubuntu-latest\n    needs: [lint, test]\n    steps:\n      - name: Build project\n        run: npm run build\n      - name: Upload build artifact\n        uses: actions/upload-artifact@v4\n        with:\n          name: dist\n          path: dist/\n  deploy_staging:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Deploy to staging\n        run: ./scripts/deploy-staging.sh\n      - name: Notify Slack\n        uses: slackapi/slack-github-action@v1\n        with:\n          payload: \'{"text":"Staging deploy completed!"}\'\n  deploy_prod:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Deploy to production\n        run: ./scripts/deploy-prod.sh\n      - name: Notify Slack\n        uses: slackapi/slack-github-action@v1\n        with:\n          payload: \'{"text":"Production deploy completed!"}\'\n      - name: Create GitHub Release\n        uses: softprops/action-gh-release@v1\n        with:\n          files: dist/**\n  notify:\n    runs-on: ubuntu-latest\n    needs: [deploy_prod]\n    steps:\n      - name: Send notification\n        run: echo "Full monorepo pipeline finished."\n'
  };

  return (
    <ErrorBoundary>
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
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 17, color: '#191826', marginRight: 4, fontWeight: 500 }}>Insert sample:</span>
                <a href="#" className="sample-pill" onClick={e => { e.preventDefault(); insertSample('basic'); }}>Basic Node.js CI</a>
                <a href="#" className="sample-pill" onClick={e => { e.preventDefault(); insertSample('intermediate'); }}>Intermediate Python Package</a>
                <a href="#" className="sample-pill" onClick={e => { e.preventDefault(); insertSample('gnarly'); }}>Monorepo CI/CD</a>
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
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '24px 0 0 0' }}>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as 'go' | 'python' | 'typescript')}
              className="shred-btn"
              style={{ fontWeight: 700 }}
            >
              <option value="go">Go</option>
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
            </select>
            <button
              onClick={handleShred}
              disabled={loading || !yaml.trim()}
              className="shred-btn"
              style={{ minWidth: 110, fontSize: 17 }}
            >
              {loading ? "Shredding..." : "Shred it"}
            </button>
            <button
              onClick={handleCopy}
              disabled={!code.trim()}
              className={`copy-btn${copied ? ' bg-green-500' : ''}`}
              style={{ minWidth: 130, fontSize: 17 }}
            >
              {copied ? 'Copied!' : 'Copy Dagger code'}
            </button>
            <a href={DOC_LINKS[language]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: '#191826', textDecoration: 'underline', alignSelf: 'center', marginLeft: 10, fontWeight: 600 }}>Dagger docs</a>
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
    </ErrorBoundary>
  );
}
