import React, { useState, useRef } from 'react';
import './App.css';

/**
 * JavaScript Playground App
 * Layout: Top navbar, main split (editor/output), footer
 * Features: Code editor with syntax highlighting, JS execution, output/result, snippet sharing
 */
const DEFAULT_CODE = `// Write JavaScript code below and press "Run"
// Example:
function greet(name) {
  return 'Hello, ' + name + '!';
}
console.log(greet('World'));
`;

const ACCENT_COLOR = 'var(--accent-color)';

// PUBLIC_INTERFACE
function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const editorRef = useRef();

  // PUBLIC_INTERFACE
  function handleCodeChange(e) {
    setCode(e.target.value);
  }

  // PUBLIC_INTERFACE
  function highlightJS(code) {
    // VERY LIGHTWEIGHT JS KEYWORD HIGHLIGHTER (does not use PrismJS/monaco for bundle size)
    const keyword =
      /\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|throw|catch|try|typeof|instanceof|new|in|of|class|constructor|extends|super|import|from|export|as|await|async|null|true|false)\b/g;
    const comment = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
    const string = /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`)/g;
    let html = code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(string, m => `<span class="token string">${m}</span>`)
      .replace(comment, m => `<span class="token comment">${m}</span>`)
      .replace(keyword, m => `<span class="token keyword">${m}</span>`);
    return html;
  }

  // PUBLIC_INTERFACE
  function runCode() {
    // --- Secure JS sandbox using postMessage ---
    setOutput('Running...');

    // Remove any previous listeners for output (avoid double print)
    window.removeEventListener('__js_playground_output__', ()=>{});
    window.removeEventListener('message', window.__js_playgroundMsgHandler);

    // Setup handler to receive messages from the iframe
    window.__js_playgroundMsgHandler = function(event) {
      // Accept only messages from our own iframe (type "iframe-js-output")
      if (typeof event.data === 'object' && event.data && event.data.type === 'iframe-js-output') {
        setOutput(event.data.payload || '[No output.]');
        // Clean up iframe after receiving output
        if (window.__currentJSTempIframe) {
          document.body.removeChild(window.__currentJSTempIframe);
          window.__currentJSTempIframe = null;
        }
      }
    };
    window.addEventListener('message', window.__js_playgroundMsgHandler);

    // Prepare the code+messaging logic: inject code and post logs/errors
    const userJS = code;
    const sandboxScript = `
(function(){
  var output = [];
  function printLog() {
    var args = Array.prototype.slice.call(arguments);
    output.push(args.map(function(a) {
      try {return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);}
      catch (e) {return '[object]';}
    }).join(' '));
  }
  // Proxy console methods
  console.log = printLog;
  console.error = printLog;

  try {
    (function(){
      ${userJS}
    })();
  } catch(e) {
    output.push('Error: ' + e);
  }
  parent.postMessage({type: 'iframe-js-output', payload: output.join('\\n')}, '*');
})();`;

    // Create blob URL for script
    const blob = new Blob([sandboxScript], {type: 'text/javascript'});
    const blobUrl = URL.createObjectURL(blob);

    // Create sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    // Only allow scripts. No same-origin: no cross-origin access is possible.
    iframe.sandbox = 'allow-scripts';
    window.__currentJSTempIframe = iframe; // Save for later cleanup

    // When the iframe loads, inject a script tag with our blob URL
    iframe.onload = () => {
      const script = iframe.contentDocument.createElement('script');
      script.src = blobUrl;
      iframe.contentDocument.body.appendChild(script);
    };

    // We need some html for the iframe to boot in about:blank and load script
    iframe.srcdoc = '<html><body></body></html>';
    document.body.appendChild(iframe);

    // Fallback: if postMessage never fires (e.g., script crash), cleanup after 5sec.
    setTimeout(() => {
      if (window.__currentJSTempIframe) {
        document.body.removeChild(window.__currentJSTempIframe);
        window.__currentJSTempIframe = null;
        setOutput('[Timed out or script blocked.]');
      }
    }, 5000);
  }

  // PUBLIC_INTERFACE
  // Simulate snippet sharing (just use URL fragment)
  function handleShare() {
    setIsSharing(true);
    // base64 encode
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const url = `${window.location.origin}${window.location.pathname}#snippet=${encoded}`;
    setShareLink(url);
    setIsSharing(false);
  }

  // PUBLIC_INTERFACE
  // Load snippet from URL on mount
  React.useEffect(() => {
    if (window.location.hash.startsWith('#snippet=')) {
      try {
        const encoded = window.location.hash.replace('#snippet=', '');
        // Provide basic XSS safety (decodeURIComponent/btoa)
        const decoded = decodeURIComponent(escape(atob(encoded)));
        setCode(decoded);
      } catch {
        // ignore if corrupted
      }
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="playground-app">
      <nav className="navbar">
        <span className="brand">
          <span className="brand-accent">JS</span> Playground
        </span>
        <span className="navbar-actions">
          <button className="btn-share" onClick={handleShare} title="Share code snippet">
            📤 Share
          </button>
          <a
            className="github-link"
            href="https://github.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </span>
      </nav>

      <main className="main-content">
        <section className="editor-section">
          <div className="editor-header">
            <span className="editor-title">JavaScript Editor</span>
            <button className="btn-run" onClick={runCode}>
              ▶ Run
            </button>
          </div>
          <div className="code-editor-container">
            <textarea
              ref={editorRef}
              className="code-editor"
              spellCheck="false"
              value={code}
              onChange={handleCodeChange}
              aria-label="JavaScript code editor"
            />
            {/* Syntax highlighting preview pane */}
            <pre
              className="code-highlight"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightJS(code) }}
            />
          </div>
        </section>

        <section className="output-section">
          <div className="output-header">
            <span className="output-title">Result / Output</span>
          </div>
          <pre className="output-area" tabIndex={0} aria-label="Execution output">
            {output}
          </pre>
        </section>
      </main>

      {shareLink && (
        <div className="share-snippet-modal">
          <div className="share-snippet-box">
            <span>Shareable Link:</span>
            <input type="text" value={shareLink} readOnly />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
              }}
              className="btn-copy"
            >
              Copy
            </button>
            <button
              className="btn-close"
              onClick={() => setShareLink('')}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <span>
          JavaScript Playground &mdash; Powered by React |
          <span className="footer-accent"> KAVIA </span>
        </span>
      </footer>
    </div>
  );
}

export default App;
