document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const codeInput = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const lineCount = document.getElementById('lineCount');
    const charCount = document.getElementById('charCount');
    const checkButton = document.getElementById('checkButton');
    const autoFixButton = document.getElementById('autoFixButton');
    const formatButton = document.getElementById('formatButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const languageSelect = document.getElementById('languageSelect');
    const themeToggle = document.getElementById('themeToggle');
    const editorContainer = document.getElementById('editorContainer');
    
    // --- ลบ: Highlighting Elements ---
    
    // --- Mobile View Elements ---
    const mobileViewToggle = document.getElementById('mobileViewToggle');
    const mobileIcon = document.getElementById('mobileIcon');
    const mainContainer = document.getElementById('main-container');

    let currentErrors = [];
    // ลบ: let highlightedErrorLines = [];

    // --- Core Functions: UI Update ---

    /**
     * Updates line numbers and character count in the UI.
     */
    function updateLineNumbers() {
        const lines = codeInput.value.split('\n');
        const numLines = lines.length || 1;
        lineNumbers.innerHTML = Array.from({ length: numLines }, (_, i) => i + 1).join('\n');
        lineCount.textContent = numLines;
        charCount.textContent = codeInput.value.length;
    }

    /**
     * Handles scroll synchronization for line numbers.
     */
    function handleScroll() {
        lineNumbers.scrollTop = codeInput.scrollTop; 
    }

    /**
     * Combined update function called on every input event.
     */
    function handleInput() {
        updateLineNumbers();
    }


    /**
     * Main function to check the code.
     */
    function checkCode() {
        const code = codeInput.value.trim();
        const language = languageSelect.value;

        if (!code) {
            showResults([{ type: 'warning', message: 'กรุณาใส่โค้ดที่ต้องการตรวจสอบ', line: 0 }]);
            return;
        }

        checkButton.innerHTML = `<span class="flex items-center justify-center space-x-2"><span>🔄</span><span>กำลังตรวจสอบ...</span></span>`;
        checkButton.disabled = true;
        autoFixButton.disabled = true;
        
        setTimeout(() => {
            const errors = analyzeCode(code, language);
            showResults(errors);
            checkButton.innerHTML = `<span class="flex items-center justify-center space-x-2"><span>🔍</span><span>ตรวจสอบโค้ด</span></span>`;
            checkButton.disabled = false;
        }, 1200);
    }

    /**
     * Analyzes code for errors, including basic syntax and linter-style checks.
     * @returns {Array<Object>} List of found errors.
     */
    function analyzeCode(code, language) {
        const errors = [];
        const lines = code.split('\n');

        // --- JavaScript & TypeScript Analysis ---
        if (['javascript', 'typescript'].includes(language)) {
            const declaredVars = new Set();
            const usedVars = new Set();

            lines.forEach((line, index) => {
                const lineNum = index + 1;
                const trimmedLine = line.trim();

                // Find declared variables (let, const, var)
                const declarationMatch = line.match(/(?:let|const|var)\s+([a-zA-Z0-9_]+)/);
                if (declarationMatch) {
                    declaredVars.add(declarationMatch[1]);
                }
                
                // Find used variables
                [...line.matchAll(/([a-zA-Z0-9_]+)/g)].forEach(match => {
                    if (!/(?:let|const|var|function|return|if|for|while|switch|case)/.test(match[1])) {
                        usedVars.add(match[1]);
                    }
                });

                // Check for missing semicolons
                if (trimmedLine && !trimmedLine.endsWith(';') && /^[a-zA-Z0-9_]/.test(trimmedLine) && !/[{}(,;]$/.test(trimmedLine)) {
                    errors.push({ type: 'error', message: 'ขาดเซมิโคลอน (;) ที่ท้ายบรรทัด', line: lineNum, fixable: true, originalCode: line });
                }
            });

            // Linter check: Unused variables
            declaredVars.forEach(v => {
                if (!usedVars.has(v)) {
                    const lineNum = lines.findIndex(l => l.includes(v)) + 1;
                    errors.push({ type: 'info', message: `ตัวแปร '${v}' ถูกประกาศแต่ไม่ได้ใช้งาน`, line: lineNum });
                }
            });
        }
        // --- Python Analysis ---
        else if (language === 'python') {
            lines.forEach((line, index) => {
                const lineNum = index + 1;
                if (line.trim().match(/^(if|for|while|def|class)\s.*[^:]$/)) {
                    errors.push({ type: 'error', message: 'ขาดเครื่องหมาย : ที่ท้ายบรรทัด', line: lineNum, fixable: true, originalCode: line });
                }
            });
        }
        // --- JSON & LINE Flex Analysis ---
        else if (['json', 'line-flex'].includes(language)) {
            try {
                const parsed = JSON.parse(code);
                if (language === 'line-flex') {
                    if (!parsed.type || parsed.type !== 'flex') errors.push({ type: 'error', message: 'Root object ต้องมี property "type": "flex"', line: 1 });
                    if (!parsed.altText) errors.push({ type: 'warning', message: 'แนะนำให้มี "altText" เพื่อการแสดงผลบนอุปกรณ์ที่ไม่รองรับ', line: 1 });
                }
            } catch (e) {
                const lineNum = e.message.match(/line (\d+)/)?.[1] || 1;
                errors.push({ type: 'error', message: `JSON Format ไม่ถูกต้อง: ${e.message}`, line: parseInt(lineNum) });
            }
        }

        if (errors.length === 0) {
            return [{ type: 'success', message: 'เยี่ยมมาก! ไม่พบข้อผิดพลาดในโค้ดของคุณ' }];
        }
        return errors;
    }

    /**
     * Renders analysis results to the UI.
     */
    function showResults(errors) {
        currentErrors = errors;
        resultsContainer.innerHTML = '';
        
        autoFixButton.disabled = !errors.some(e => e.fixable);

        if (errors.length === 0 || (errors.length === 1 && errors[0].type === 'success' && !codeInput.value.trim())) {
            resultsContainer.innerHTML = `<div class="text-center py-16">
                <div class="floating-animation mb-6"><div class="inline-block p-6 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-slate-700 dark:to-purple-900 rounded-full"><div class="text-6xl">💡</div></div></div>
                <h3 class="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">ระบบตรวจสอบโค้ดอัจฉริยะ</h3>
                <p class="text-gray-600 dark:text-gray-400">ใส่โค้ดแล้วกดปุ่ม "ตรวจสอบโค้ด" ได้เลย</p>
            </div>`;
            return;
        }

        errors.forEach((error, index) => {
            const card = document.createElement('div');
            // NOTE: Removed `clickable-error` visual feedback class as it relied on old error line detection logic
            card.className = `fade-in p-5 rounded-xl border-l-4 shadow-lg transition-all duration-300 ${getCardStyles(error.type)} ${error.line > 0 ? 'clickable-error' : ''}`;
            card.innerHTML = createErrorCardHTML(error, index);
            if (error.line > 0) {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.ai-button, .fix-button')) return;
                    goToLine(error.line);
                });
            }
            resultsContainer.appendChild(card);
        });

        // Add event listeners for new buttons
        document.querySelectorAll('.ai-button').forEach(btn => btn.addEventListener('click', handleAIExplain));
        document.querySelectorAll('.fix-button').forEach(btn => btn.addEventListener('click', handleFixSingleError));
    }
    
    // --- UI & Utility Functions ---
    
    function getCardStyles(type) {
        switch(type) {
            case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-500';
            case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500';
            case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500';
            case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-500';
            default: return 'bg-gray-50 dark:bg-slate-800 border-gray-500';
        }
    }

    function createErrorCardHTML(error, index) {
        const icons = { error: '❌', warning: '⚠️', info: 'ℹ️', success: '✅' };
        const colors = { error: 'text-red-700 dark:text-red-300', warning: 'text-yellow-700 dark:text-yellow-300', info: 'text-blue-700 dark:text-blue-300', success: 'text-green-700 dark:text-green-300'};

        return `
            <div class="flex items-start space-x-4">
                <div class="text-2xl pt-1">${icons[error.type] || '🔔'}</div>
                <div class="flex-1">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span class="font-bold text-lg ${colors[error.type]}">${error.type.charAt(0).toUpperCase() + error.type.slice(1)}</span>
                        ${error.line > 0 ? `<span class="bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-semibold">📍 บรรทัด ${error.line}</span>` : ''}
                    </div>
                    <p class="text-gray-800 dark:text-gray-200 leading-relaxed">${error.message}</p>
                    <div class="mt-4 space-x-2">
                        ${error.type !== 'success' ? `<button data-index="${index}" class="ai-button bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-all">🧠 อธิบายด้วย AI</button>` : ''}
                        ${error.fixable ? `<button data-index="${index}" class="fix-button bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition-all">🔧 แก้ไขบรรทัดนี้</button>` : ''}
                    </div>
                    <div id="ai-explanation-${index}" class="mt-3 hidden"></div>
                </div>
            </div>`;
    }

    function handleAIExplain(e) {
        const index = e.target.dataset.index;
        const explanationContainer = document.getElementById(`ai-explanation-${index}`);
        const error = currentErrors[index];
        
        if (explanationContainer.classList.toggle('hidden')) return;

        explanationContainer.innerHTML = `<div class="p-3 bg-white dark:bg-slate-700 rounded-lg animate-pulse">กำลังสอบถาม AI...</div>`;

        setTimeout(() => {
            const explanation = getAIExplanationText(error);
            explanationContainer.innerHTML = `<div class="p-4 bg-blue-50 dark:bg-slate-700 rounded-lg border-l-4 border-blue-400">
                <p class="font-bold text-blue-800 dark:text-blue-300">🤖 DinoBot AI อธิบายว่า:</p>
                <p class="text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">${explanation}</p>
            </div>`;
            explanationContainer.classList.remove('animate-pulse');
        }, 1000);
    }

    function getAIExplanationText(error) {
        if (error.message.includes('เซมิโคลอน')) {
            return 'ในภาษา JavaScript, เซมิโคลอน (;) ใช้เพื่อบ่งบอกการสิ้นสุดของคำสั่ง (Statement) การละเลยอาจทำให้ JavaScript Engine ตีความโค้ดผิดพลาดในบางกรณี โดยเฉพาะเมื่อมีการย่อโค้ด (Minify) ครับ';
        }
        if (error.message.includes('เครื่องหมาย :')) {
            return 'ในภาษา Python, เครื่องหมาย colon (:) มีความสำคัญมาก ใช้เพื่อเริ่มต้นบล็อกของโค้ด (Indented block) ที่จะทำงานภายใต้เงื่อนไขหรือฟังก์ชัน เช่น `if`, `for`, `def` ครับ';
        }
        if (error.message.includes('ตัวแปร') && error.message.includes('ไม่ได้ใช้งาน')) {
            return 'การประกาศตัวแปรทิ้งไว้โดยไม่ได้เรียกใช้งาน ถือเป็น Code Smell หรือโค้ดที่มีแนวโน้มก่อปัญหา อาจทำให้โค้ดดูรก, เปลืองหน่วยความจำเล็กน้อย และทำให้คนอื่นสับสนเมื่อมาอ่านโค้ดของเราครับ ควรลบตัวแปรที่ไม่ใช้ออกไป';
        }
        return 'ข้อผิดพลาดนี้เกิดจากไวยากรณ์ (Syntax) ของโค้ดไม่ถูกต้องตามหลักของภาษาที่เลือก กรุณาตรวจสอบการสะกด, เครื่องหมาย, และโครงสร้างของโค้ดในบรรทัดดังกล่าวครับ';
    }
    
    function handleFixSingleError(e) {
        const index = e.target.dataset.index;
        const error = currentErrors[index];
        if (!error || !error.fixable) return;
    
        const lines = codeInput.value.split('\n');
        if (error.line > 0 && error.line <= lines.length) {
            if (error.message.includes('เซมิโคลอน')) lines[error.line - 1] = error.originalCode + ';';
            if (error.message.includes('เครื่องหมาย :')) lines[error.line - 1] = error.originalCode + ':';
            
            codeInput.value = lines.join('\n');
            handleInput(); // Re-render line count
            showToast(`แก้ไขบรรทัดที่ ${error.line} สำเร็จ!`, 'success');
            setTimeout(checkCode, 500);
        }
    }
    
    function autoFixCode() {
        let lines = codeInput.value.split('\n');
        let fixedCount = 0;
        
        currentErrors.forEach(error => {
            if (error.fixable && error.line > 0 && error.line <= lines.length) {
                if (error.message.includes('เซมิโคลอน')) lines[error.line - 1] = error.originalCode + ';';
                if (error.message.includes('เครื่องหมาย :')) lines[error.line - 1] = error.originalCode + ':';
                fixedCount++;
            }
        });

        if (fixedCount > 0) {
            codeInput.value = lines.join('\n');
            handleInput(); // Re-render line count
            showToast(`แก้ไขโค้ด ${fixedCount} จุดสำเร็จ!`, 'success');
            setTimeout(checkCode, 500);
        } else {
            showToast('ไม่พบข้อผิดพลาดที่สามารถแก้ไขอัตโนมัติได้', 'warning');
        }
    }

    function formatCode() {
        const language = languageSelect.value;
        let code = codeInput.value;
        try {
            if (language === 'json' || language === 'line-flex') {
                const parsed = JSON.parse(code);
                codeInput.value = JSON.stringify(parsed, null, 2);
            } else {
                // Basic indentation for other languages as a demo
                const lines = code.split('\n');
                let indentLevel = 0;
                const indentedLines = lines.map(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
                        indentLevel = Math.max(0, indentLevel - 1);
                    }
                    const indentedLine = '  '.repeat(indentLevel) + trimmed;
                    if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
                        indentLevel++;
                    }
                    return indentedLine;
                });
                codeInput.value = indentedLines.join('\n');
            }
            handleInput(); // Re-render line count
            showToast('จัดรูปแบบโค้ดสำเร็จ!', 'success');
        } catch (e) {
            showToast('ไม่สามารถจัดรูปแบบโค้ดได้ โค้ดอาจมีข้อผิดพลาด', 'error');
        }
    }

    function goToLine(lineNumber) {
        if (lineNumber <= 0) return;
        const lines = codeInput.value.split('\n');
        const totalHeight = codeInput.scrollHeight;
        const lineHeight = totalHeight / lines.length;
        const scrollPosition = (lineNumber - 1) * lineHeight;
        
        codeInput.scrollTop = scrollPosition;
        codeInput.focus();
        
        editorContainer.classList.add('editor-highlight');
        setTimeout(() => editorContainer.classList.remove('editor-highlight'), 700);
    }
    
    function showToast(message, type = 'info') {
        const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-blue-600'};
        const toast = document.createElement('div');
        toast.className = `fixed top-6 right-6 ${colors[type]} text-white px-5 py-3 rounded-lg shadow-2xl z-50 transform transition-transform duration-300 translate-x-full`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    function loadSample(type) {
        const samples = {
            'js': `function calculateSum(a, b) {\n    let result = a + b\n    let unusedVar = 10;\n    console.log(result)\n    return result\n}`,
            'python': `def calculate_sum(a, b)\n    result = a + b\n    print(result)\n    return result`,
            'line-flex': `{"type": "flex","contents": {"type": "bubble"}}`,
            'json': `{"name":"John","age":30,"city":"Bangkok"}`
        };
        if (samples[type]) {
            codeInput.value = samples[type];
            languageSelect.value = (type === 'line-flex') ? 'json' : type;
            handleInput(); // Update UI
            showToast(`โหลดตัวอย่างโค้ด ${type.toUpperCase()} แล้ว!`, 'info');
            resultsContainer.innerHTML = '';
            checkCode();
        }
    }

    // --- Theme Management ---
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    function toggleMobileView() {
        const isMobileView = document.body.classList.toggle('mobile-view');
        if (isMobileView) {
            mobileIcon.textContent = '💻';
            mobileViewToggle.title = 'กลับไปมุมมองเดสก์ท็อป';
        } else {
            mobileIcon.textContent = '📱';
            mobileViewToggle.title = 'จำลองมุมมองมือถือ';
        }
    }

    // --- Event Listeners ---
    codeInput.addEventListener('input', handleInput);
    codeInput.addEventListener('scroll', handleScroll);
    languageSelect.addEventListener('change', handleInput);
    checkButton.addEventListener('click', checkCode);
    autoFixButton.addEventListener('click', autoFixCode);
    formatButton.addEventListener('click', formatCode);
    themeToggle.addEventListener('click', toggleTheme);
    mobileViewToggle.addEventListener('click', toggleMobileView);
    
    // Add event listeners for sample buttons
    document.getElementById('sample-js').addEventListener('click', () => loadSample('js'));
    document.getElementById('sample-python').addEventListener('click', () => loadSample('python'));
    document.getElementById('sample-line-flex').addEventListener('click', () => loadSample('line-flex'));
    document.getElementById('sample-java').addEventListener('click', () => loadSample('java'));
    document.getElementById('sample-json').addEventListener('click', () => loadSample('json'));
    document.getElementById('sample-sql').addEventListener('click', () => loadSample('sql'));

    // --- Initializations ---
    handleInput();
    showResults([]);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    }
});
