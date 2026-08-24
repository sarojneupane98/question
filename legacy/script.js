let questionCount = 0;
const paperContainer = document.getElementById('paper-container');
const questionsContainer = document.getElementById('questions-container');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (paperContainer) {
        loadWork();
        paperContainer.addEventListener('input', saveWork);
        paperContainer.addEventListener('click', handlePaperClicks);
    }
});

// Event Delegation for Clicks
function handlePaperClicks(e) {
    // Delete main question block
    if (e.target.closest('.delete-btn')) {
        e.target.closest('.question-block').remove();
        saveWork();
    }
    
    // Delete a sub-question (a, b, c)
    if (e.target.closest('.delete-sub-btn')) {
        const listContainer = e.target.closest('.sub-list');
        e.target.closest('.sub-item').remove();
        if (listContainer) updateLabels(listContainer);
        saveWork();
    }

    // Add a new MCQ Option (i, ii, iii)
    if (e.target.closest('.add-opt-btn')) {
        const optList = e.target.closest('.option-list');
        const newOpt = document.createElement('div');
        newOpt.className = 'mcq-option';
        newOpt.innerHTML = `<span class="opt-label"></span> <span class="editable-field" contenteditable="true">New Option</span><button class="delete-opt-btn no-print">✖</button>`;
        optList.insertBefore(newOpt, e.target.closest('.add-opt-btn'));
        updateOptionLabels(optList);
        saveWork();
    }

    // Delete an MCQ Option (i, ii, iii)
    if (e.target.closest('.delete-opt-btn')) {
        const optList = e.target.closest('.option-list');
        e.target.closest('.mcq-option').remove();
        updateOptionLabels(optList);
        saveWork();
    }
    // Delete entire FIB hint box
    if (e.target.closest('.delete-hint-box-btn')) {
        e.target.closest('.fib-hint-container').remove();
        saveWork();
    }

    // Add a new FIB word
    if (e.target.closest('.add-word-btn')) {
        const wordContainer = e.target.closest('.fib-hint-container').querySelector('.fib-words');
        const newWord = document.createElement('div');
        newWord.className = 'fib-word-item';
        newWord.innerHTML = `<span class="editable-field" contenteditable="true">New Word</span><button class="delete-word-btn no-print">✖</button>`;
        wordContainer.appendChild(newWord);
        saveWork();
    }

    // Delete a single FIB word
    if (e.target.closest('.delete-word-btn')) {
        e.target.closest('.fib-word-item').remove();
        saveWork();
    }
}
function triggerUpload(element) {
    const fileInput = element.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.click();
    }
}
function previewSubImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        const subItem = input.closest('.sub-item');
        const imgElement = subItem.querySelector('.uploaded-image');
        const uploadArea = subItem.querySelector('.image-upload-area');
        
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            imgElement.style.display = 'block';
            uploadArea.style.display = 'none'; 
            saveWork();
        };
        reader.readAsDataURL(file);
    }
}

// HTML Templates
const templates = {
    mcq: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Choose the correct option.</div>
            <div class="editable-field q-marks" contenteditable="true">[5]</div>
        </div>
        <div class="sub-list" data-list-type="alpha">
            <div class="sub-item" style="margin-bottom: 15px; display: block;">
                <div style="margin-bottom: 8px;">
                    <span class="sub-label">a)</span> <span class="editable-field q-subtext" contenteditable="true">Type your first question here...</span>
                    <button class="delete-sub-btn no-print">✖</button>
                </div>
                <div class="option-list">
                    <div class="mcq-option"><span class="opt-label">i)</span> <span class="editable-field" contenteditable="true">Option 1</span><button class="delete-opt-btn no-print">✖</button></div>
                    <div class="mcq-option"><span class="opt-label">ii)</span> <span class="editable-field" contenteditable="true">Option 2</span><button class="delete-opt-btn no-print">✖</button></div>
                    <div class="mcq-option"><span class="opt-label">iii)</span> <span class="editable-field" contenteditable="true">Option 3</span><button class="delete-opt-btn no-print">✖</button></div>
                    <button class="add-opt-btn no-print">+ Add Option</button>
                </div>
            </div>
            <button class="add-sub-btn no-print" onclick="addSubItem(this, 'mcq-q')">+ Add Question</button>
        </div>
    `,
    
    fib: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Fill in the blanks.</div>
            <div class="editable-field q-marks" contenteditable="true">[5]</div>
        </div>
        
        <!-- The Help Box Container -->
        <div class="fib-hint-container">
            <button class="delete-hint-box-btn no-print" title="Remove Hint Box">✖</button>
            <div class="fib-words">
                <div class="fib-word-item"><span class="editable-field" contenteditable="true">Word 1</span><button class="delete-word-btn no-print">✖</button></div>
                <div class="fib-word-item"><span class="editable-field" contenteditable="true">Word 2</span><button class="delete-word-btn no-print">✖</button></div>
                <div class="fib-word-item"><span class="editable-field" contenteditable="true">Word 3</span><button class="delete-word-btn no-print">✖</button></div>
            </div>
            <button class="add-word-btn no-print">+ Add Word</button>
        </div>

        <div class="sub-list" data-list-type="alpha">
            <div class="sub-item" style="margin-bottom: 8px;"><span class="sub-label">a)</span> <span class="editable-field q-subtext" contenteditable="true">The sky is ............................................</span><button class="delete-sub-btn no-print">✖</button></div>
            <div class="sub-item" style="margin-bottom: 8px;"><span class="sub-label">b)</span> <span class="editable-field q-subtext" contenteditable="true">Fish live in ............................................</span><button class="delete-sub-btn no-print">✖</button></div>
            <button class="add-sub-btn no-print" onclick="addSubItem(this, 'fib')">+ Add Blank Row</button>
        </div>
    `,

    tf: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Write 'T' for True and 'F' for False.</div>
            <div class="editable-field q-marks" contenteditable="true">[3]</div>
        </div>
        <div class="sub-list" data-list-type="alpha">
            <div class="sub-item" style="margin-bottom: 8px;">
                <span class="sub-label">a)</span> <span class="editable-field q-subtext" contenteditable="true">A dog has four legs.</span> &nbsp;&nbsp; [ &nbsp;<span class="editable-field" contenteditable="true">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp; ] <button class="delete-sub-btn no-print">✖</button>
            </div>
            <div class="sub-item" style="margin-bottom: 8px;">
                <span class="sub-label">b)</span> <span class="editable-field q-subtext" contenteditable="true">The sun rises in the west.</span> &nbsp;&nbsp; [ &nbsp;<span class="editable-field" contenteditable="true">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp; ] <button class="delete-sub-btn no-print">✖</button>
            </div>
            <button class="add-sub-btn no-print" onclick="addSubItem(this, 'tf')">+ Add Row</button>
        </div>
    `,

    match: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Match Column A with Column B.</div>
            <div class="editable-field q-marks" contenteditable="true">[4]</div>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 10px;">
            <div style="flex: 1;" class="sub-list" data-list-type="alpha">
                <strong>Column A</strong>
                <div class="sub-item" style="margin-top: 8px;"><span class="sub-label">a)</span> <span class="editable-field" contenteditable="true">Item 1</span><button class="delete-sub-btn no-print">✖</button></div>
                <div class="sub-item" style="margin-top: 8px;"><span class="sub-label">b)</span> <span class="editable-field" contenteditable="true">Item 2</span><button class="delete-sub-btn no-print">✖</button></div>
                <button class="add-sub-btn no-print" onclick="addSubItem(this, 'match-a')">+ Add to A</button>
            </div>
            <div style="flex: 1;" class="sub-list" data-list-type="roman">
                <strong>Column B</strong>
                <div class="sub-item" style="margin-top: 8px;"><span class="sub-label">i)</span> <span class="editable-field" contenteditable="true">Match A</span><button class="delete-sub-btn no-print">✖</button></div>
                <div class="sub-item" style="margin-top: 8px;"><span class="sub-label">ii)</span> <span class="editable-field" contenteditable="true">Match B</span><button class="delete-sub-btn no-print">✖</button></div>
                <button class="add-sub-btn no-print" onclick="addSubItem(this, 'match-b')">+ Add to B</button>
            </div>
        </div>
    `,

    image: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Look at the pictures and name the following devices.</div>
            <div class="editable-field q-marks" contenteditable="true">[4]</div>
        </div>
        <div class="sub-list" data-list-type="alpha">
            <div class="sub-item" style="margin-bottom: 15px; border: 1px dashed var(--border-color); padding: 12px; border-radius: 6px; background: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span class="sub-label" style="font-weight: bold;">a)</span>
                    <div class="image-upload-area no-print" style="padding: 8px 12px; font-size: 12px; flex: 1; text-align: center; cursor: pointer;" onclick="triggerUpload(this)">
                        <span>📷 Upload Picture</span>
                        <input type="file" accept="image/*" style="display:none;" onchange="previewSubImage(this)">
                    </div>
                    <img class="uploaded-image" src="" alt="" style="display: none; max-width: 70px; max-height: 70px; object-fit: contain; border: 1px solid #ccc;">
                    <button class="delete-sub-btn no-print">✖</button>
                </div>
                <div>
                    <span class="editable-field q-subtext" contenteditable="true">Name this device: ............................................</span>
                </div>
            </div>
            
            <div class="sub-item" style="margin-bottom: 15px; border: 1px dashed var(--border-color); padding: 12px; border-radius: 6px; background: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span class="sub-label" style="font-weight: bold;">b)</span>
                    <div class="image-upload-area no-print" style="padding: 8px 12px; font-size: 12px; flex: 1; text-align: center; cursor: pointer;" onclick="triggerUpload(this)">
                        <span>📷 Upload Picture</span>
                        <input type="file" accept="image/*" style="display:none;" onchange="previewSubImage(this)">
                    </div>
                    <img class="uploaded-image" src="" alt="" style="display: none; max-width: 70px; max-height: 70px; object-fit: contain; border: 1px solid #ccc;">
                    <button class="delete-sub-btn no-print">✖</button>
                </div>
                <div>
                    <span class="editable-field q-subtext" contenteditable="true">Name this device: ............................................</span>
                </div>
            </div>

            <button class="add-sub-btn no-print" onclick="addSubItem(this, 'img-multi')">+ Add Picture Question</button>
        </div>
    `,
    qa: (num) => `
        <div class="question-header">
            <div class="editable-field q-text" contenteditable="true">${num}. Answer the following questions.</div>
            <div class="editable-field q-marks" contenteditable="true">[6]</div>
        </div>
        <div class="sub-list" data-list-type="alpha">
            <div class="sub-item" style="margin-bottom: 15px;">
                <div style="margin-bottom: 5px;">
                    <span class="sub-label">a)</span> <span class="editable-field q-subtext" contenteditable="true">Name any two Living things.</span>
                    <button class="delete-sub-btn no-print">✖</button>
                </div>
                <div style="margin-left: 20px; display: flex; align-items: flex-end;">
                    <strong>Ans:-</strong> <span class="editable-field fill-blank" contenteditable="true" style="margin-left: 10px;"></span>
                </div>
            </div>
            <div class="sub-item" style="margin-bottom: 15px;">
                <div style="margin-bottom: 5px;">
                    <span class="sub-label">b)</span> <span class="editable-field q-subtext" contenteditable="true">Type your second question here...</span>
                    <button class="delete-sub-btn no-print">✖</button>
                </div>
                <div style="margin-left: 20px; display: flex; align-items: flex-end;">
                    <strong>Ans:-</strong> <span class="editable-field fill-blank" contenteditable="true" style="margin-left: 10px;"></span>
                </div>
            </div>
            <button class="add-sub-btn no-print" onclick="addSubItem(this, 'qa')">+ Add Question</button>
        </div>
    `,
};

const subItemHTML = {
    'mcq-q': `
        <div style="margin-bottom: 8px;">
            <span class="sub-label"></span> <span class="editable-field q-subtext" contenteditable="true">New question...</span>
            <button class="delete-sub-btn no-print">✖</button>
        </div>
        <div class="option-list">
            <div class="mcq-option"><span class="opt-label">i)</span> <span class="editable-field" contenteditable="true">Option 1</span><button class="delete-opt-btn no-print">✖</button></div>
            <div class="mcq-option"><span class="opt-label">ii)</span> <span class="editable-field" contenteditable="true">Option 2</span><button class="delete-opt-btn no-print">✖</button></div>
            <button class="add-opt-btn no-print">+ Add Option</button>
        </div>`,
    'fib': `<span class="sub-label"></span> <span class="editable-field q-subtext" contenteditable="true">New blank .......................</span><button class="delete-sub-btn no-print">✖</button>`,
    'tf': `<span class="sub-label"></span> <span class="editable-field q-subtext" contenteditable="true">New statement...</span> &nbsp;&nbsp; [ &nbsp;<span class="editable-field" contenteditable="true">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp; ] <button class="delete-sub-btn no-print">✖</button>`,
    'match-a': `<span class="sub-label"></span> <span class="editable-field" contenteditable="true">New Item</span><button class="delete-sub-btn no-print">✖</button>`,
    'match-b': `<span class="sub-label"></span> <span class="editable-field" contenteditable="true">New Match</span><button class="delete-sub-btn no-print">✖</button>`,
    'qa': `
        <div style="margin-bottom: 5px;">
            <span class="sub-label"></span> <span class="editable-field q-subtext" contenteditable="true">Type your question here...</span>
            <button class="delete-sub-btn no-print">✖</button>
        </div>
        <div style="margin-left: 20px; display: flex; align-items: flex-end;">
            <strong>Ans:-</strong> <span class="editable-field fill-blank" contenteditable="true" style="margin-left: 10px;"></span>
        </div>
    `,
    'img-multi': `
        <div class="sub-item" style="margin-bottom: 15px; border: 1px dashed var(--border-color); padding: 12px; border-radius: 6px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span class="sub-label" style="font-weight: bold;"></span>
                <div class="image-upload-area no-print" style="padding: 8px 12px; font-size: 12px; flex: 1; text-align: center; cursor: pointer;" onclick="triggerUpload(this)">
                    <span>📷 Upload Picture</span>
                    <input type="file" accept="image/*" style="display:none;" onchange="previewSubImage(this)">
                </div>
                <img class="uploaded-image" src="" alt="" style="display: none; max-width: 70px; max-height: 70px; object-fit: contain; border: 1px solid #ccc;">
                <button class="delete-sub-btn no-print">✖</button>
            </div>
            <div>
                <span class="editable-field q-subtext" contenteditable="true">Name this device: ............................................</span>
            </div>
        </div>
    `,
};

function addQuestion(type) {
    if (!questionsContainer || !templates[type]) return;
    
    questionCount++;
    const block = document.createElement('div');
    block.className = 'question-block';
    
    const controls = `
        <div class="question-controls no-print">
            <button class="delete-btn" title="Delete Question">🗑️ Delete Question</button>
        </div>
    `;
    
    block.innerHTML = controls + templates[type](questionCount);
    questionsContainer.appendChild(block);
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    saveWork();
}

function addSubItem(btnElement, type) {
    const listContainer = btnElement.parentElement;
    const newItem = document.createElement('div');
    newItem.className = 'sub-item';
    
    if (type !== 'mcq-opt') newItem.style.marginTop = '8px';
    
    newItem.innerHTML = subItemHTML[type];
    listContainer.insertBefore(newItem, btnElement);
    
    updateLabels(listContainer);
    saveWork();
}

function updateLabels(container) {
    const listType = container.getAttribute('data-list-type');
    const items = container.querySelectorAll('.sub-item');
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    
    items.forEach((item, index) => {
        const label = item.querySelector('.sub-label');
        if (label) {
            if (listType === 'alpha') label.innerText = alphabet[index] + ')';
            else if (listType === 'roman') label.innerText = roman[index] + ')';
        }
    });
}

function previewImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        const questionBlock = input.closest('.question-block');
        const imgElement = questionBlock.querySelector('.uploaded-image');
        const uploadArea = questionBlock.querySelector('.image-upload-area');
        
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            imgElement.style.display = 'block';
            uploadArea.style.display = 'none'; 
            saveWork();
        };
        reader.readAsDataURL(file);
    }
}

function saveWork() {
    if (!paperContainer) return;
    localStorage.setItem('examPaperHtml_v2', paperContainer.innerHTML);
    localStorage.setItem('questionCount_v2', questionCount);
}

function loadWork() {
    const savedHtml = localStorage.getItem('examPaperHtml_v2');
    const savedCount = localStorage.getItem('questionCount_v2');
    
    if (savedHtml && paperContainer) {
        paperContainer.innerHTML = savedHtml;
    }
    if (savedCount) {
        questionCount = parseInt(savedCount, 10);
    }
}

function clearWork() {
    if (confirm("Are you sure you want to clear all questions and start fresh?")) {
        localStorage.removeItem('examPaperHtml_v2');
        localStorage.removeItem('questionCount_v2');
        location.reload(); 
    }
}

function downloadPDF() {
    const element = document.getElementById('paper-container');
    
    // 1. Temporarily lock to exact A4 dimensions and margins for the export
    element.classList.add('force-a4-pdf');
    
    const opt = {
        margin:       0,
        filename:     'exam-paper.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true,
            ignoreElements: function(node) {
                return node.classList && node.classList.contains('no-print');
            }
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 2. Generate PDF, then remove the lock once it's done processing
    html2pdf().from(element).set(opt).save().then(() => {
        element.classList.remove('force-a4-pdf');
    });
}
// Toggle Preeti Font
function toggleNepaliFont() {
    const paper = document.getElementById('paper-container');
    const toggle = document.getElementById('font-toggle');
    
    if (toggle.checked) {
        paper.classList.add('nepali-text');
    } else {
        paper.classList.remove('nepali-text');
    }
    saveWork(); // Saves the font preference to localStorage
}

function downloadDOCX() {
    const paperElement = document.getElementById('paper-container').cloneNode(true);
    
    // 1. Remove control buttons from the export copy
    const noPrintElements = paperElement.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());

    // 2. Lock text contents so they don't remain editable boxes in Word
    const editables = paperElement.querySelectorAll('[contenteditable="true"]');
    editables.forEach(el => {
        el.removeAttribute('contenteditable');
    });

    // 3. THE WORD FIX: Convert flexbox layouts into HTML Tables so Word aligns them properly

    // Fix the Exam Meta Header (Class, Subject, FM)
    const metaRows = paperElement.querySelectorAll('.meta-row');
    metaRows.forEach(row => {
        const left = row.querySelector('.meta-left') ? row.querySelector('.meta-left').innerHTML : '';
        const center = row.querySelector('.meta-center') ? row.querySelector('.meta-center').innerHTML : '';
        const right = row.querySelector('.meta-right') ? row.querySelector('.meta-right').innerHTML : '';
        
        const tableHTML = `
            <table width="100%" style="width:100%; border:none; margin-bottom: 5px; font-size:16px; font-weight:bold; font-family:'Tahoma',sans-serif;">
                <tr>
                    <td width="33%" style="text-align:left; vertical-align:bottom;">${left}</td>
                    <td width="34%" style="text-align:center; vertical-align:bottom;">${center}</td>
                    <td width="33%" style="text-align:right; vertical-align:bottom;">${right}</td>
                </tr>
            </table>
        `;
        row.outerHTML = tableHTML;
    });

    // Fix the Student Details Row (Name, Roll, Sec, Inv)
    const studentDetails = paperElement.querySelector('.student-details');
    if (studentDetails) {
        const name = studentDetails.querySelector('.name-field') ? studentDetails.querySelector('.name-field').innerHTML : '';
        const roll = studentDetails.querySelector('.roll-field') ? studentDetails.querySelector('.roll-field').innerHTML : '';
        const sec = studentDetails.querySelector('.sec-field') ? studentDetails.querySelector('.sec-field').innerHTML : '';
        const inv = studentDetails.querySelector('.inv-field') ? studentDetails.querySelector('.inv-field').innerHTML : '';
        
        const studentTable = `
            <table width="100%" style="width:100%; border:none; margin-top: 15px; margin-bottom: 25px; font-size:16px; font-weight:bold; font-family:'Tahoma',sans-serif;">
                <tr>
                    <td width="40%" style="text-align:left;">${name}</td>
                    <td width="20%" style="text-align:left;">${roll}</td>
                    <td width="20%" style="text-align:left;">${sec}</td>
                    <td width="20%" style="text-align:left;">${inv}</td>
                </tr>
            </table>
        `;
        studentDetails.outerHTML = studentTable;
    }

    // Fix "Match the Following" columns
    const subLists = paperElement.querySelectorAll('.sub-list');
    subLists.forEach(list => {
        if(list.parentElement.style.display === 'flex' || list.parentElement.style.display.includes('flex')) {
            const parent = list.parentElement;
            // Only convert if it hasn't been converted yet
            if(parent.tagName !== 'TD' && parent.tagName !== 'TABLE') {
                const colA = parent.children[0] ? parent.children[0].innerHTML : '';
                const colB = parent.children[1] ? parent.children[1].innerHTML : '';
                
                const matchTable = `
                    <table width="100%" style="width:100%; border:none; margin-top:10px;">
                        <tr>
                            <td width="50%" valign="top" style="font-family:'Tahoma',sans-serif;">${colA}</td>
                            <td width="50%" valign="top" style="font-family:'Tahoma',sans-serif;">${colB}</td>
                        </tr>
                    </table>
                `;
                parent.outerHTML = matchTable;
            }
        }
    });

    // 4. Wrap everything in a dedicated Word-compatible HTML structure
    const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>Exam Paper</title>
            <style>
                /* Injecting strict rules for Word */
                body { font-family: 'Tahoma', sans-serif; font-size: 16px; color: #000; line-height: 1.5; }
                .school-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
                .school-header h2 { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; text-align: center; }
                .school-header p { font-size: 18px; font-weight: bold; margin: 5px 0 0 0; padding: 0; text-align: center; }
                .question-header { font-size: 18px; font-weight: bold; margin-bottom: 12px; margin-top: 20px; }
                .subject-name { font-size: 18px; font-weight: bold; border-bottom: 1px dotted #000; padding-bottom: 2px; }
                .sub-item { margin-bottom: 12px; margin-left: 20px; }
                .fill-blank { border-bottom: 1px dotted #000; display: inline-block; width: 200px; }
                .mcq-option { display: inline-block; margin-right: 25px; margin-top: 5px; }
                .fib-hint-container { border: 1px solid #000; padding: 15px; text-align: center; margin-bottom: 15px; background: #fff; }
                .fib-word-item { display: inline-block; margin-right: 15px; font-weight: bold; }
                .q-subtext { margin-right: 10px; }
                .q-marks { float: right; }
            </style>
        </head>
        <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
    `;
    
    const footer = `
            </div>
        </body>
        </html>
    `;

    const htmlString = header + paperElement.innerHTML + footer;
    
    // 5. Generate and download the file
    const blob = new Blob(['\ufeff', htmlString], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'exam-paper.doc';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}
// --- UNICODE TO PREETI CONVERSION ENGINE ---

function convertAndCopy() {
    let unicodeText = document.getElementById("unicode-input").value;
    
    if (!unicodeText) return;

    // The mapping arrays for Nepali Unicode to Preeti ASCII
    var array_one = new Array(
        "ञ्म", "ङ्घ", "ण्ड", "ष्ट", "ष्ठ", "श्व", "स्न", "त्र", "त्त", "द्भ", "झ्र", "्य", "्र", "र्", 
        "क्", "ख्", "ग्", "घ्", "ङ्", "च्", "छ्", "ज्", "झ्", "ञ्", "ट्", "ठ्", "ड्", "ढ्", "ण्", 
        "त्", "थ्", "द्", "ध्", "न्", "प्", "फ्", "ब्", "भ्", "म्", "य्", "ल्", "व्", "श्", "ष्", "स्", "ह्",
        "क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण",
        "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह",
        "अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए", "ऐ", "ओ", "औ", "ं", "ँ", "ः", "ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "्",
        "०", "१", "२", "३", "४", "५", "६", "७", "८", "९", "।", "॥", "ॐ"
    );

    var array_two = new Array(
        "~d", "ª\\", "0f\\", "i\\", "i7", "Zj", ":g", "q", "Q", "De", "em", "o\\", "|", "{",
        "s\\", "v\\", "u\\", "3\\", "ª", "r\\", "5\\", "h\\", "em\\", "`\\", "6\\", "7\\", "8\\", "9\\", "0f\\",
        "t\\", "y\\", "b\\", "w\\", "g\\", "k\\", "km\\", "a\\", "e\\", "d\\", "o\\", "n\\", "j\\", "z\\", "i\\", "s\\", "x\\",
        "s", "v", "u", "3", "ª", "r", "5", "h", "em", "`", "6", "7", "8", "9", "0f",
        "t", "y", "b", "w", "g", "k", "km", "a", "e", "d", "o", "/", "n", "j", "z", "i", "x", "x",
        "c", "cf", "O", "O{", "p", "pm", "C", "P", "P]", "cf]", "cf}", "a", "F", "M", "f", "l", "t", "ୁ", "ୂ", "[", "e", "w", "o", "au", "\\",
        ")", "!", "@", "#", "$", "%", "^", "&", "*", "(", ".", "..", "cf]d"
    );

    let preetiText = unicodeText;

    // Pass 1: Replace basic characters
    for (let i = 0; i < array_one.length; i++) {
        let regex = new RegExp(array_one[i], "g");
        preetiText = preetiText.replace(regex, array_two[i]);
    }

    // Pass 2: Fix the 'hrasso-i' (f) position issue in Preeti
    // In Preeti, 'l' (hrasso-i) must physically precede the consonant it modifies
    let positionOfI = preetiText.indexOf("l");
    while (positionOfI !== -1) {
        let characterToSwap = preetiText.charAt(positionOfI - 1);
        preetiText = preetiText.replace(characterToSwap + "l", "l" + characterToSwap);
        positionOfI = preetiText.indexOf("l", positionOfI + 1);
    }

    // Pass 3: Fix spacing and common punctuation anomalies
    preetiText = preetiText.replace(/ /g, " "); // Ensure spaces are preserved
    
    // Copy to clipboard securely
    navigator.clipboard.writeText(preetiText).then(() => {
        const msg = document.getElementById('copy-msg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2500);
        
        // Clear input for next use
        document.getElementById("unicode-input").value = "";
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert("Failed to copy. Your browser might block clipboard access.");
    });
}