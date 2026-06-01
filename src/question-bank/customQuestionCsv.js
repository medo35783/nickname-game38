const CSV_HEADER_ALIASES = {
  question_text: ['question_text', 'السؤال', 'نص السؤال', 'question'],
  correct_answer: ['correct_answer', 'الإجابة', 'الاجابة', 'الإجابة الصحيحة', 'answer'],
  options: ['options', 'الخيارات', 'خيارات'],
  category: ['category', 'التصنيف'],
  difficulty_level: ['difficulty_level', 'الصعوبة', 'difficulty'],
  type: ['type', 'نوع السؤال', 'النوع'],
};

function normalizeToken(value) {
  return String(value || '').trim();
}

function splitListValue(value) {
  return String(value || '')
    .split(/[|،,؛;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  cells.push(value.trim());
  return cells;
}

function getCsvDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function getCanonicalHeader(header) {
  const cleaned = normalizeToken(header).replace(/^\uFEFF/, '');
  return (
    Object.entries(CSV_HEADER_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => alias.toLowerCase() === cleaned.toLowerCase())
    )?.[0] || cleaned
  );
}

export function parseCustomQuestionsCsv(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('الملف يحتاج صف عناوين وصف سؤال واحد على الأقل');
  }

  const delimiter = getCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(getCanonicalHeader);

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const row = { rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      row[header] = cells[headerIndex] || '';
    });

    const type = normalizeToken(row.type) || 'multiple_choice';
    const options = type === 'multiple_choice' ? splitListValue(row.options).slice(0, 4) : [];
    const difficulty = normalizeToken(row.difficulty_level) || 'medium';
    const validDiff = ['hard', 'medium', 'easy'].includes(difficulty) ? difficulty : 'medium';

    return {
      rowNumber: row.rowNumber,
      question_text: normalizeToken(row.question_text),
      correct_answer: normalizeToken(row.correct_answer),
      category: normalizeToken(row.category) || 'general',
      difficulty_level: validDiff,
      type,
      options,
      error: !normalizeToken(row.question_text) ? 'نص السؤال فارغ' : null,
    };
  });
}

export const CUSTOM_CSV_TEMPLATE = `question_text,options,correct_answer,difficulty_level,category,type
ما عاصمة مصر؟,القاهرة|الإسكندرية|الرياض|بغداد,القاهرة,easy,geography,multiple_choice
من مكتشف الجاذبية؟,نيوتن|أينشتاين|جاليليو|داروين,نيوتن,hard,general,multiple_choice`;

export function downloadCustomCsvTemplate() {
  const blob = new Blob(['\uFEFF' + CUSTOM_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qumairi-questions-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
