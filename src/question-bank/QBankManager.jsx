import { useState, useEffect, useMemo, useRef } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { COLORS } from '../core/constants';
import '../styles/base.css';
import {
  suggestQuestion,
  getAdminQuestions,
  approveQuestion,
  rejectQuestion,
  deleteQuestion,
  QB_SOURCE,
  QB_CATEGORIES,
  QB_DIFFICULTIES,
  QB_TYPES,
  QB_GAME_TYPES,
  QB_AUDIENCES,
  normalizeGameTypes,
  assertGameTypesValid,
} from './qbank.helpers';

const EMPTY_FORM = {
  question_text: '',
  correct_answer: '',
  supervisor_notes: '',
  category: '',
  difficulty_level: '',
  audience: 'general',
  type: '',
  gameTypes: [],
  options: ['', '', '', ''],
  correctOptionIndex: null,
  tagsText: '',
};

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];
const TRUE_FALSE_OPTIONS = ['صح', 'خطأ'];

const CATEGORY_LABELS = {
  religious: 'ديني',
  geography: 'جغرافيا',
  plants: 'نباتات',
  animals: 'حيوانات',
  sports: 'رياضة',
  acting_proverbs: 'تمثيل وأمثال',
  five_items: 'اسم/حيوان/نبات/جماد/بلاد',
  general: 'عام',
};

const DIFFICULTY_LABELS = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

const TYPE_LABELS = {
  multiple_choice: 'اختيار من متعدد',
  true_false: 'صح أو خطأ',
  open_question: 'سؤال مفتوح',
  written_text: 'نص كتابي',
};

const STATUS_LABELS = {
  pending: 'بانتظار الموافقة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const GAME_TYPE_LABELS = {
  qumayri: 'القميري',
  titles: 'الألقاب',
  hesbah: 'حَسْبة',
  all: 'كل الألعاب',
};

const AUDIENCE_LABELS = {
  general: 'عام',
  family: 'عائلي',
  kids: 'أطفال',
};

const CSV_HEADER_ALIASES = {
  question_text: ['question_text', 'السؤال', 'نص السؤال', 'question'],
  correct_answer: ['correct_answer', 'الإجابة', 'الاجابة', 'الإجابة الصحيحة', 'answer'],
  options: ['options', 'الخيارات', 'خيارات'],
  category: ['category', 'التصنيف'],
  difficulty_level: ['difficulty_level', 'الصعوبة', 'difficulty'],
  type: ['type', 'نوع السؤال', 'النوع'],
  gameTypes: ['gameTypes', 'game_types', 'اللعبة', 'الألعاب', 'العاب'],
  tags: ['tags', 'وسوم', 'الوسوم'],
  audience: ['audience', 'الفئة', 'الفئة المستهدفة', 'العمر'],
  supervisor_notes: ['supervisor_notes', 'ملاحظات المشرف', 'ملاحظات', 'notes'],
};

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

function questionMatchesFilters(question, filters) {
  if (filters.category && question.category !== filters.category) return false;
  if (filters.difficulty_level && question.difficulty_level !== filters.difficulty_level) return false;
  if (filters.status && question.status !== filters.status) return false;
  if (filters.audience && (question.audience || 'general') !== filters.audience) return false;
  if (filters.gameType && !Array.isArray(question.gameTypes)) return false;
  if (filters.gameType) {
    const normalized = normalizeGameTypes(question.gameTypes);
    if (!normalized.includes(filters.gameType) && filters.gameType !== 'all') return false;
  }
  return true;
}

function questionMatchesSearch(question, searchText) {
  const query = normalizeSearchText(searchText);
  if (!query) return true;

  const haystack = normalizeSearchText([
    question.question_text,
    question.correct_answer,
    question.category,
    question.difficulty_level,
    question.type,
    question.status,
    question.audience,
    ...(Array.isArray(question.gameTypes) ? question.gameTypes : []),
    ...(Array.isArray(question.tags) ? question.tags : []),
  ].join(' '));

  return haystack.includes(query);
}

function isDuplicateQuestion(candidate, existingQuestion) {
  const candidateText = normalizeSearchText(candidate.question_text);
  const existingText = normalizeSearchText(existingQuestion.question_text);
  if (!candidateText || !existingText) return false;
  if (candidateText === existingText) return true;

  const minLength = Math.min(candidateText.length, existingText.length);
  return minLength >= 24 && (candidateText.includes(existingText) || existingText.includes(candidateText));
}

function findDuplicateQuestion(candidate, questions, ignoredId = null) {
  return questions.find((question) =>
    question.id !== ignoredId && isDuplicateQuestion(candidate, question)
  );
}

function hasDuplicateValues(values) {
  const normalized = values.map(normalizeSearchText).filter(Boolean);
  return new Set(normalized).size !== normalized.length;
}

function getQualityWarnings(payload) {
  const warnings = [];

  if (payload.question_text.length > 0 && payload.question_text.length < 12) {
    warnings.push('نص السؤال قصير جدًا');
  }
  if (!payload.tags?.length) {
    warnings.push('لا توجد وسوم للسؤال');
  }
  if (!payload.audience) {
    warnings.push('لم يتم تحديد الفئة المستهدفة');
  }
  if (payload.type === 'multiple_choice') {
    const filledOptions = payload.options.filter(Boolean);
    if (hasDuplicateValues(filledOptions)) {
      warnings.push('يوجد خيارات مكررة');
    }
    if (filledOptions.some((option) => option.length < 2)) {
      warnings.push('بعض الخيارات قصيرة جدًا');
    }
  }

  return warnings;
}

function truncateText(text, maxLength = 86) {
  const value = String(text || '').trim();
  if (value.length <= maxLength) return value || '—';
  return `${value.slice(0, maxLength)}...`;
}

function splitTags(tagsText) {
  return String(tagsText || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getCorrectOptionIndex(options, correctAnswer) {
  const answer = String(correctAnswer || '').trim();
  if (!answer) return null;

  const index = normalizeOptions(options).findIndex((option) => option.trim() === answer);
  return index >= 0 ? index : null;
}

function normalizeOptions(options) {
  const list = Array.isArray(options) ? options : [];
  return [0, 1, 2, 3].map((index) => list[index] || '');
}

function normalizeCsvToken(value) {
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
  const cleaned = normalizeCsvToken(header).replace(/^\uFEFF/, '');
  return Object.entries(CSV_HEADER_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => alias.toLowerCase() === cleaned.toLowerCase())
  )?.[0] || cleaned;
}

function parseCsvText(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('ملف CSV يحتاج صف عناوين وصف سؤال واحد على الأقل');
  }

  const delimiter = getCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(getCanonicalHeader);

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const row = { rowNumber: index + 2 };

    headers.forEach((header, headerIndex) => {
      row[header] = cells[headerIndex] || '';
    });

    return row;
  });
}

function csvRowToQuestion(row) {
  const type = normalizeCsvToken(row.type);
  const options = type === 'multiple_choice' ? splitListValue(row.options).slice(0, 4) : [];

  return {
    rowNumber: row.rowNumber,
    question_text: normalizeCsvToken(row.question_text),
    correct_answer: normalizeCsvToken(row.correct_answer),
    supervisor_notes: normalizeCsvToken(row.supervisor_notes),
    category: normalizeCsvToken(row.category),
    difficulty_level: normalizeCsvToken(row.difficulty_level),
    type,
    gameTypes: normalizeGameTypes(splitListValue(row.gameTypes)),
    options,
    tags: splitListValue(row.tags),
    audience: normalizeCsvToken(row.audience) || 'general',
    status: 'approved',
  };
}

function validateQuestionPayload(payload) {
  if (!payload.question_text) return 'نص السؤال مفقود';
  if (payload.type !== 'written_text' && !payload.correct_answer) return 'الإجابة الصحيحة مفقودة';
  if (!QB_CATEGORIES.includes(payload.category)) return 'التصنيف غير صحيح';
  if (!QB_DIFFICULTIES.includes(payload.difficulty_level)) return 'الصعوبة غير صحيحة';
  if (!QB_TYPES.includes(payload.type)) return 'نوع السؤال غير صحيح';
  const gameTypesError = assertGameTypesValid(payload.gameTypes);
  if (gameTypesError) return gameTypesError;
  if (!QB_AUDIENCES.includes(payload.audience || 'general')) return 'الفئة المستهدفة غير صحيحة';
  if (payload.type === 'multiple_choice' && payload.options.length !== 4) return 'اختيار متعدد يحتاج 4 خيارات';
  if (payload.type === 'multiple_choice' && !payload.options.includes(payload.correct_answer)) {
    return 'الإجابة الصحيحة يجب أن تطابق أحد الخيارات';
  }
  if (payload.type === 'true_false' && !TRUE_FALSE_OPTIONS.includes(payload.correct_answer)) return 'إجابة صح/خطأ غير صحيحة';

  return null;
}

function badgeStyle(color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 9px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    color,
    background: `${color}18`,
    border: `1px solid ${color}44`,
    whiteSpace: 'nowrap',
  };
}

function selectablePillStyle(isSelected) {
  return {
    borderColor: isSelected ? 'var(--gold)' : 'var(--border-subtle)',
    color: isSelected ? 'var(--gold)' : 'var(--text-soft)',
    background: isSelected ? 'rgba(240,192,64,.1)' : 'var(--surface)',
  };
}

function getDifficultyColor(difficulty) {
  if (difficulty === 'hard') return COLORS.red;
  if (difficulty === 'medium') return COLORS.gold;
  return COLORS.green;
}

function getStatusColor(status) {
  if (status === 'approved') return COLORS.green;
  if (status === 'pending') return COLORS.gold;
  return COLORS.red;
}

export default function QBankManager({ notify }) {
  const [isAdmin] = useState(() => (
    typeof localStorage !== 'undefined' && localStorage.getItem('pfcc_is_admin') === 'true'
  ));
  const [activeTab, setActiveTab] = useState('questions');
  const [filters, setFilters] = useState({
    category: '',
    difficulty_level: '',
    gameType: '',
    audience: '',
  });
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [keepDefaults, setKeepDefaults] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const questionTextRef = useRef(null);
  const csvInputRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let isActive = true;

    async function loadQuestions() {
      setLoading(true);
      setError(null);

      try {
        const all = await getAdminQuestions({});

        if (isActive) {
          setAllQuestions(sortQuestions(all));
          setQuestions(sortQuestions(all.filter((question) =>
            questionMatchesFilters(question, { ...cleanFilters(filters), status: 'approved' })
          )));
          setPendingQuestions(sortQuestions(all.filter((question) => question.status === 'pending')));
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isActive = false;
    };
  }, [
    isAdmin,
    filters.category,
    filters.difficulty_level,
    filters.gameType,
    filters.audience,
  ]);

  const visibleQuestions = useMemo(
    () => questions.filter((question) => questionMatchesSearch(question, searchText)),
    [questions, searchText]
  );

  const bankStats = useMemo(() => {
    const approvedQuestions = allQuestions.filter((question) => question.status === 'approved');

    return {
      total: approvedQuestions.length,
      easy: approvedQuestions.filter((question) => question.difficulty_level === 'easy').length,
      medium: approvedQuestions.filter((question) => question.difficulty_level === 'medium').length,
      hard: approvedQuestions.filter((question) => question.difficulty_level === 'hard').length,
    };
  }, [allQuestions]);

  const pendingStats = useMemo(() => ({
    total: pendingQuestions.length,
    easy: pendingQuestions.filter((question) => question.difficulty_level === 'easy').length,
    medium: pendingQuestions.filter((question) => question.difficulty_level === 'medium').length,
    hard: pendingQuestions.filter((question) => question.difficulty_level === 'hard').length,
  }), [pendingQuestions]);

  if (!isAdmin) return null;

  function showNotice(message, type = 'success') {
    if (typeof notify === 'function') {
      notify(message, type);
    }

    setNotice({ message, type });
  }

  function sortQuestions(list) {
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function reloadQuestions() {
    setLoading(true);
    setError(null);

    try {
      const all = await getAdminQuestions({});
      setAllQuestions(sortQuestions(all));
      setQuestions(sortQuestions(all.filter((question) =>
        questionMatchesFilters(question, { ...cleanFilters(filters), status: 'approved' })
      )));
      setPendingQuestions(sortQuestions(all.filter((question) => question.status === 'pending')));
    } catch (reloadError) {
      setError(reloadError);
      showNotice(reloadError?.message || 'تعذر تحميل الأسئلة', 'error');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleTypeChange(type) {
    setForm((current) => {
      const correctOptionIndex = type === 'multiple_choice'
        ? getCorrectOptionIndex(current.options, current.correct_answer)
        : null;
      const correctAnswer = type === 'true_false' && TRUE_FALSE_OPTIONS.includes(current.correct_answer)
        ? current.correct_answer
        : '';

      return {
        ...current,
        type,
        correct_answer: correctAnswer,
        correctOptionIndex,
      };
    });
  }

  function updateOption(index, value) {
    setForm((current) => {
      const nextOptions = [...current.options];
      nextOptions[index] = value;
      return { ...current, options: nextOptions };
    });
  }

  function toggleGameType(gameType) {
    setForm((current) => {
      const exists = current.gameTypes.includes(gameType);
      const gameTypes = exists
        ? current.gameTypes.filter((item) => item !== gameType)
        : [...current.gameTypes, gameType];

      return { ...current, gameTypes };
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function getEmptyFormForNextQuestion(current, shouldKeepSettings) {
    if (!shouldKeepSettings) return EMPTY_FORM;

    return {
      ...EMPTY_FORM,
      category: current.category,
      difficulty_level: current.difficulty_level,
      audience: current.audience,
      type: current.type,
      gameTypes: [...current.gameTypes],
    };
  }

  function validateForm(payload) {
    if (!payload.question_text) return 'اكتب نص السؤال';
    if (!payload.category) return 'اختر التصنيف';
    if (!payload.difficulty_level) return 'اختر مستوى الصعوبة';
    if (!payload.type) return 'اختر نوع السؤال';
    if (!payload.gameTypes.length) return 'اختر لعبة واحدة على الأقل';
    const payloadError = validateQuestionPayload(payload);
    if (payloadError && payload.type !== 'multiple_choice') return payloadError;
    if (payload.type === 'multiple_choice' && payload.options.length !== 4) {
      return 'أدخل الخيارات الأربعة أ/ب/ج/د';
    }
    if (payload.type === 'multiple_choice' && form.correctOptionIndex == null) {
      return 'اختر الإجابة الصحيحة من الخيارات';
    }
    if (payloadError) return payloadError;

    return null;
  }

  function buildPayload(status = 'approved') {
    const type = form.type;
    const options = type === 'multiple_choice'
      ? form.options.map((option) => option.trim()).filter(Boolean)
      : [];
    const correctAnswer = type === 'multiple_choice'
      ? options[form.correctOptionIndex] || ''
      : type === 'written_text'
        ? ''
        : form.correct_answer.trim();

    return {
      question_text: form.question_text.trim(),
      correct_answer: correctAnswer,
      supervisor_notes: type === 'written_text' ? form.supervisor_notes.trim() : '',
      category: form.category,
      difficulty_level: form.difficulty_level,
      audience: form.audience || 'general',
      type,
      gameTypes: normalizeGameTypes(form.gameTypes),
      options,
      tags: splitTags(form.tagsText),
      status,
    };
  }

  async function handleSubmit(event, options = {}) {
    event.preventDefault();

    const shouldContinueEntry = Boolean(options.continueEntry);
    const shouldKeepSettings = shouldContinueEntry || keepDefaults;
    const payload = buildPayload('approved');
    const validationError = validateForm(payload);
    if (validationError) {
      showNotice(validationError, 'error');
      return;
    }

    const duplicate = findDuplicateQuestion(payload, allQuestions, editingId);
    if (duplicate) {
      const ok = window.confirm(`قد يكون هذا السؤال مكررًا:\n\n${duplicate.question_text}\n\nهل تريد المتابعة؟`);
      if (!ok) return;
    }

    const qualityWarnings = getQualityWarnings(payload);
    if (qualityWarnings.length) {
      const ok = window.confirm(`تنبيهات جودة قبل الحفظ:\n- ${qualityWarnings.join('\n- ')}\n\nهل تريد الحفظ رغم ذلك؟`);
      if (!ok) return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await update(ref(db, `question-bank/${editingId}`), {
          ...payload,
          updatedAt: Date.now(),
        });
        showNotice('تم تعديل السؤال بنجاح', 'success');
      } else {
        const created = await suggestQuestion(payload);
        if (created?.id) {
          await approveQuestion(created.id);
        }
        showNotice('تم حفظ السؤال واعتماده بنجاح', 'success');
      }

      if (shouldContinueEntry) {
        setEditingId(null);
        setForm((current) => getEmptyFormForNextQuestion(current, true));
        setActiveTab('add');
        setTimeout(() => questionTextRef.current?.focus(), 0);
      } else if (shouldKeepSettings) {
        setEditingId(null);
        setForm((current) => getEmptyFormForNextQuestion(current, true));
      } else {
        resetForm();
        setActiveTab('questions');
      }

      await reloadQuestions();
    } catch (saveError) {
      showNotice(saveError?.message || 'تعذر حفظ السؤال', 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(question) {
    setEditingId(question.id);
    setForm({
      question_text: question.question_text || '',
      correct_answer: question.correct_answer || '',
      supervisor_notes: question.supervisor_notes || '',
      category: question.category || '',
      difficulty_level: question.difficulty_level || '',
      audience: question.audience || 'general',
      type: question.type || '',
      gameTypes: normalizeGameTypes(Array.isArray(question.gameTypes) ? question.gameTypes : []),
      options: normalizeOptions(question.options),
      correctOptionIndex: getCorrectOptionIndex(question.options, question.correct_answer),
      tagsText: Array.isArray(question.tags) ? question.tags.join(', ') : '',
    });
    setActiveTab('add');
  }

  function handleCopyQuestion(question) {
    setEditingId(null);
    setForm({
      question_text: question.question_text || '',
      correct_answer: question.correct_answer || '',
      supervisor_notes: question.supervisor_notes || '',
      category: question.category || '',
      difficulty_level: question.difficulty_level || '',
      audience: question.audience || 'general',
      type: question.type || '',
      gameTypes: normalizeGameTypes(Array.isArray(question.gameTypes) ? question.gameTypes : []),
      options: normalizeOptions(question.options),
      correctOptionIndex: getCorrectOptionIndex(question.options, question.correct_answer),
      tagsText: Array.isArray(question.tags) ? question.tags.join(', ') : '',
    });
    setActiveTab('add');
    showNotice('تم نسخ السؤال كنموذج جديد — عدّله ثم احفظه', 'info');
    setTimeout(() => questionTextRef.current?.focus(), 0);
  }

  function communityNeedsClassification(question) {
    if (question?.source !== QB_SOURCE.COMMUNITY) return false;
    const gameTypes = normalizeGameTypes(Array.isArray(question.gameTypes) ? question.gameTypes : []);
    return !question.category || !question.difficulty_level || !gameTypes.length;
  }

  async function handleApprove(questionId) {
    const question = pendingQuestions.find((item) => item.id === questionId);
    if (communityNeedsClassification(question)) {
      showNotice('حدّد التصنيف والصعوبة واللعبة عبر «تصنيف واعتماد»', 'info');
      handleEditAndApprove(question);
      return;
    }

    try {
      await approveQuestion(questionId);
      showNotice('تم اعتماد السؤال', 'success');
      await reloadQuestions();
    } catch (approveError) {
      showNotice(approveError?.message || 'تعذر اعتماد السؤال', 'error');
    }
  }

  async function handleReject(questionId) {
    const reason = window.prompt('سبب الرفض (يظهر للمساهم):', 'يحتاج مراجعة أو تعديل');
    if (reason === null) return;

    try {
      await rejectQuestion(questionId, reason);
      showNotice('تم رفض المقترح', 'success');
      await reloadQuestions();
    } catch (rejectError) {
      showNotice(rejectError?.message || 'تعذر رفض السؤال', 'error');
    }
  }

  async function handleDelete(questionId, actionLabel = 'حذف') {
    const ok = window.confirm(`هل تريد ${actionLabel} هذا السؤال؟`);
    if (!ok) return;

    try {
      await deleteQuestion(questionId);
      showNotice('تم حذف السؤال', 'success');
      await reloadQuestions();
    } catch (deleteError) {
      showNotice(deleteError?.message || 'تعذر حذف السؤال', 'error');
    }
  }

  function handleEditAndApprove(question) {
    startEdit({
      ...question,
      status: 'approved',
    });
    showNotice('صنّف السؤال (تصنيف، صعوبة، فئة، لعبة) ثم احفظ لاعتماده', 'info');
  }

  async function handleCsvFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvPreview([]);

    try {
      const text = await file.text();
      const parsedRows = parseCsvText(text);
      const preview = parsedRows.map((row) => {
        const question = csvRowToQuestion(row);
        const duplicate = findDuplicateQuestion(question, allQuestions);
        return {
          ...question,
          error: validateQuestionPayload(question),
          duplicateWarning: duplicate ? `قد يكون مكررًا مع: ${truncateText(duplicate.question_text, 42)}` : '',
          qualityWarnings: getQualityWarnings(question),
        };
      });

      setCsvPreview(preview);
      const invalidCount = preview.filter((row) => row.error).length;
      showNotice(
        invalidCount
          ? `تمت قراءة الملف مع ${invalidCount} صف يحتاج مراجعة`
          : `تمت قراءة ${preview.length} سؤال وجاهزة للحفظ`,
        invalidCount ? 'info' : 'success'
      );
    } catch (readError) {
      setCsvError(readError?.message || 'تعذر قراءة ملف CSV');
    } finally {
      event.target.value = '';
    }
  }

  async function handleImportCsvQuestions() {
    const validRows = csvPreview.filter((row) => !row.error);
    if (!validRows.length) {
      showNotice('لا توجد أسئلة صالحة للحفظ من الملف', 'error');
      return;
    }

    const rowsWithWarnings = validRows.filter((row) => row.duplicateWarning || row.qualityWarnings?.length);
    if (rowsWithWarnings.length) {
      const ok = window.confirm(
        `يوجد ${rowsWithWarnings.length} صف فيه تنبيهات جودة أو احتمال تكرار.\nهل تريد حفظ الصفوف الصالحة رغم ذلك؟`
      );
      if (!ok) return;
    }

    setCsvImporting(true);

    try {
      for (const row of validRows) {
        const created = await suggestQuestion({
          question_text: row.question_text,
          correct_answer: row.correct_answer,
          supervisor_notes: row.supervisor_notes || '',
          category: row.category,
          difficulty_level: row.difficulty_level,
          audience: row.audience || 'general',
          type: row.type,
          gameTypes: row.gameTypes,
          options: row.options,
          tags: row.tags,
          status: 'approved',
        });

        if (created?.id) {
          await approveQuestion(created.id);
        }
      }

      showNotice(`تم حفظ ${validRows.length} سؤال من CSV`, 'success');
      setCsvPreview([]);
      await reloadQuestions();
    } catch (importError) {
      showNotice(importError?.message || 'تعذر حفظ أسئلة CSV', 'error');
    } finally {
      setCsvImporting(false);
    }
  }

  function renderSelect(label, value, onChange, options, labels, allLabel = 'الكل') {
    return (
      <label className="ig" style={{ minWidth: 130, flex: 1 }}>
        <span className="lbl">{label}</span>
        <select className="inp" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {labels?.[option] || option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderQuestionCard(question) {
    const difficultyColor = getDifficultyColor(question.difficulty_level);
    const statusColor = getStatusColor(question.status);
    const gameTypes = Array.isArray(question.gameTypes) ? question.gameTypes : [];

    return (
      <div
        key={question.id}
        className="card2"
        style={{
          marginBottom: 10,
          borderColor: question.status === 'pending' ? 'rgba(240,192,64,.26)' : COLORS.border,
        }}
      >
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', lineHeight: 1.6 }}>
              {truncateText(question.question_text)}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={badgeStyle(COLORS.blue)}>{CATEGORY_LABELS[question.category] || question.category || '—'}</span>
              <span style={badgeStyle(difficultyColor)}>
                {DIFFICULTY_LABELS[question.difficulty_level] || question.difficulty_level || '—'}
              </span>
              <span style={badgeStyle(COLORS.purple)}>{TYPE_LABELS[question.type] || question.type || '—'}</span>
              <span style={badgeStyle(COLORS.muted)}>{AUDIENCE_LABELS[question.audience || 'general'] || 'عام'}</span>
              <span style={badgeStyle(statusColor)}>{STATUS_LABELS[question.status] || question.status || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {gameTypes.length ? gameTypes.map((gameType) => (
                <span key={gameType} className="tag tb">
                  {GAME_TYPE_LABELS[gameType] || gameType}
                </span>
              )) : <span className="tag tm">لا توجد ألعاب</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 164 }}>
            <button type="button" className="btn bxs bb" onClick={() => startEdit(question)}>
              تعديل
            </button>
            <button type="button" className="btn bxs bgh" onClick={() => handleCopyQuestion(question)}>
              نسخ
            </button>
            {question.status === 'pending' && (
              <button type="button" className="btn bxs bv" onClick={() => handleApprove(question.id)}>
                موافقة
              </button>
            )}
            <button type="button" className="btn bxs br" onClick={() => handleDelete(question.id)}>
              حذف
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderStatCard(label, value, color) {
    return (
      <div style={styles.statCard}>
        <div style={{ fontFamily: 'Cairo, sans-serif', fontSize: 19, fontWeight: 900, color }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, marginTop: 3 }}>
          {label}
        </div>
      </div>
    );
  }

  function renderQuestionsTab() {
    return (
      <>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">إحصائيات بنك الأسئلة</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 8 }}>
            {renderStatCard('إجمالي المعتمد', bankStats.total, COLORS.gold)}
            {renderStatCard('سهل', bankStats.easy, COLORS.green)}
            {renderStatCard('متوسط', bankStats.medium, COLORS.blue)}
            {renderStatCard('صعب', bankStats.hard, COLORS.red)}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">تصفية الأسئلة</div>
          <div className="ig">
            <label className="lbl" htmlFor="qbank-search">بحث سريع</label>
            <input
              id="qbank-search"
              className="inp"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="ابحث في نص السؤال، الإجابة، الوسوم، التصنيف..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {renderSelect(
              'التصنيف',
              filters.category,
              (value) => updateFilter('category', value),
              QB_CATEGORIES,
              CATEGORY_LABELS
            )}
            {renderSelect(
              'الصعوبة',
              filters.difficulty_level,
              (value) => updateFilter('difficulty_level', value),
              QB_DIFFICULTIES,
              DIFFICULTY_LABELS
            )}
            {renderSelect(
              'اللعبة',
              filters.gameType,
              (value) => updateFilter('gameType', value),
              QB_GAME_TYPES,
              GAME_TYPE_LABELS
            )}
            {renderSelect(
              'الفئة المستهدفة',
              filters.audience,
              (value) => updateFilter('audience', value),
              QB_AUDIENCES,
              AUDIENCE_LABELS
            )}
          </div>
        </div>

        <div className="card">
          <div className="ctitle">
            الأسئلة ({visibleQuestions.length}
            {visibleQuestions.length !== questions.length ? ` من ${questions.length}` : ''})
          </div>
          {loading && <div style={styles.emptyState}>جاري تحميل الأسئلة...</div>}
          {!loading && visibleQuestions.length === 0 && <div style={styles.emptyState}>لا توجد أسئلة مطابقة للفلاتر أو البحث</div>}
          {!loading && visibleQuestions.map(renderQuestionCard)}
        </div>
      </>
    );
  }

  function renderAnswerFields() {
    if (form.type === 'multiple_choice') {
      return (
        <div className="ig">
          <div className="lbl">خيارات الإجابة — اختر الإجابة الصحيحة من الراديو</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {OPTION_LABELS.map((label, index) => {
              const selected = form.correctOptionIndex === index;

              return (
                <label
                  key={label}
                  style={{
                    ...styles.optionRow,
                    borderColor: selected ? 'var(--gold)' : 'var(--border-subtle)',
                    background: selected ? 'rgba(240,192,64,.09)' : 'var(--surface)',
                  }}
                >
                  <input
                    type="radio"
                    name="qbank-correct-option"
                    checked={selected}
                    onChange={() => updateForm('correctOptionIndex', index)}
                    style={{ accentColor: COLORS.gold }}
                  />
                  <span style={styles.optionLabel}>{label}</span>
                  <input
                    className="inp"
                    required
                    value={form.options[index]}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`الخيار ${label}`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    if (form.type === 'true_false') {
      return (
        <div className="ig">
          <div className="lbl">الإجابة الصحيحة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TRUE_FALSE_OPTIONS.map((answer) => {
              const selected = form.correct_answer === answer;

              return (
                <button
                  key={answer}
                  type="button"
                  className={`btn ${selected ? 'bg' : 'bgh'}`}
                  onClick={() => updateForm('correct_answer', answer)}
                  style={{
                    minHeight: 48,
                    border: selected ? '1.5px solid var(--gold)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {answer}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (form.type === 'open_question') {
      return (
        <div className="ig">
          <label className="lbl" htmlFor="qbank-correct-answer">الإجابة الصحيحة</label>
          <input
            id="qbank-correct-answer"
            className="inp"
            required
            value={form.correct_answer}
            onChange={(event) => updateForm('correct_answer', event.target.value)}
            placeholder="الإجابة النصية المعتمدة"
          />
        </div>
      );
    }

    if (form.type === 'written_text') {
      return (
        <div className="ig">
          <label className="lbl" htmlFor="qbank-supervisor-notes">
            ملاحظات المشرف — إجابات متوقعة أو تعليق (لا يظهر للاعبين)
          </label>
          <textarea
            id="qbank-supervisor-notes"
            className="inp"
            rows={4}
            value={form.supervisor_notes}
            onChange={(event) => updateForm('supervisor_notes', event.target.value)}
            placeholder="مثال: ذئب، wolf&#10;أو: اقرأ الحرف «ر» فقط للجميع"
          />
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
            في القميري وحَسْبة يظهر للاعبين حقل كتابة واعتماد فقط — هذه الملاحظة للمشرف وحده.
          </p>
        </div>
      );
    }

    return (
      <div style={styles.emptyState}>
        اختر نوع السؤال أولاً لإظهار طريقة إدخال الإجابة المناسبة.
      </div>
    );
  }

  function renderCsvImportPanel() {
    const validCount = csvPreview.filter((row) => !row.error).length;
    const invalidCount = csvPreview.length - validCount;

    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="ctitle" style={{ marginBottom: 3 }}>رفع ملف أسئلة CSV</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
              الأعمدة: question_text, correct_answer, options, category, difficulty_level, type, gameTypes, tags, audience
            </div>
          </div>
          <button
            type="button"
            className="btn bsm bb"
            style={{ width: 'auto' }}
            onClick={() => csvInputRef.current?.click()}
          >
            رفع ملف أسئلة
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {csvError && (
          <div className="ann ar" style={{ marginTop: 10, color: COLORS.red }}>
            {csvError}
          </div>
        )}

        {!!csvPreview.length && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={badgeStyle(COLORS.green)}>صالح: {validCount}</span>
              <span style={badgeStyle(invalidCount ? COLORS.red : COLORS.muted)}>يحتاج مراجعة: {invalidCount}</span>
            </div>

            <div style={{ display: 'grid', gap: 7, maxHeight: 260, overflowY: 'auto', paddingInlineEnd: 2 }}>
              {csvPreview.slice(0, 20).map((row) => (
                <div
                  key={`${row.rowNumber}-${row.question_text}`}
                  className="card2"
                  style={{
                    marginBottom: 0,
                    borderColor: row.error ? 'rgba(230,57,80,.35)' : 'rgba(46,204,113,.24)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text)', lineHeight: 1.6 }}>
                    صف {row.rowNumber}: {truncateText(row.question_text, 72)}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    <span style={badgeStyle(COLORS.blue)}>{CATEGORY_LABELS[row.category] || row.category || '—'}</span>
                    <span style={badgeStyle(getDifficultyColor(row.difficulty_level))}>
                      {DIFFICULTY_LABELS[row.difficulty_level] || row.difficulty_level || '—'}
                    </span>
                    <span style={badgeStyle(COLORS.purple)}>{TYPE_LABELS[row.type] || row.type || '—'}</span>
                    <span style={badgeStyle(COLORS.muted)}>{AUDIENCE_LABELS[row.audience] || row.audience || '—'}</span>
                    {row.error && <span style={badgeStyle(COLORS.red)}>{row.error}</span>}
                    {row.duplicateWarning && <span style={badgeStyle(COLORS.gold)}>{row.duplicateWarning}</span>}
                    {!!row.qualityWarnings?.length && !row.error && (
                      <span style={badgeStyle(COLORS.gold)}>
                        جودة: {row.qualityWarnings.join('، ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {csvPreview.length > 20 && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                يتم عرض أول 20 صف فقط للمعاينة.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                className="btn bg"
                disabled={csvImporting || !validCount}
                style={{ flex: 2, minWidth: 150 }}
                onClick={handleImportCsvQuestions}
              >
                {csvImporting ? 'جاري الحفظ...' : `حفظ ${validCount} سؤال صالح`}
              </button>
              <button
                type="button"
                className="btn bgh"
                disabled={csvImporting}
                style={{ flex: 1, minWidth: 110 }}
                onClick={() => {
                  setCsvPreview([]);
                  setCsvError(null);
                }}
              >
                مسح المعاينة
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFormTab() {
    const tagChips = splitTags(form.tagsText);
    const draftPayload = buildPayload('approved');
    const liveQualityWarnings = form.question_text || form.type ? getQualityWarnings(draftPayload) : [];
    const liveDuplicate = draftPayload.question_text
      ? findDuplicateQuestion(draftPayload, allQuestions, editingId)
      : null;

    return (
      <>
      {renderCsvImportPanel()}

      <form className="card" onSubmit={handleSubmit}>
        <div className="ctitle">{editingId ? 'تعديل سؤال' : 'إضافة سؤال جديد'}</div>

        <div className="ig">
          <label className="lbl" htmlFor="qbank-question-text">نص السؤال</label>
          <textarea
            id="qbank-question-text"
            ref={questionTextRef}
            className="inp"
            required
            value={form.question_text}
            onChange={(event) => updateForm('question_text', event.target.value)}
            placeholder="اكتب السؤال هنا..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
          {renderSelect(
            'التصنيف',
            form.category,
            (value) => updateForm('category', value),
            QB_CATEGORIES,
            CATEGORY_LABELS,
            'اختر التصنيف'
          )}
          {renderSelect(
            'الصعوبة',
            form.difficulty_level,
            (value) => updateForm('difficulty_level', value),
            QB_DIFFICULTIES,
            DIFFICULTY_LABELS,
            'اختر الصعوبة'
          )}
          {renderSelect(
            'نوع السؤال',
            form.type,
            handleTypeChange,
            QB_TYPES,
            TYPE_LABELS,
            'اختر النوع'
          )}
          {renderSelect(
            'الفئة المستهدفة',
            form.audience,
            (value) => updateForm('audience', value || 'general'),
            QB_AUDIENCES,
            AUDIENCE_LABELS,
            'اختر الفئة'
          )}
        </div>

        {renderAnswerFields()}

        <div className="ig">
          <div className="lbl">الألعاب</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {QB_GAME_TYPES.map((gameType) => (
              <label
                key={gameType}
                style={{
                  ...styles.checkboxPill,
                  ...selectablePillStyle(form.gameTypes.includes(gameType)),
                }}
              >
                <input
                  type="checkbox"
                  checked={form.gameTypes.includes(gameType)}
                  onChange={() => toggleGameType(gameType)}
                  style={{ accentColor: COLORS.gold }}
                />
                {GAME_TYPE_LABELS[gameType] || gameType}
              </label>
            ))}
          </div>
        </div>

        <div className="ig">
          <label className="lbl" htmlFor="qbank-tags">وسوم السؤال</label>
          <input
            id="qbank-tags"
            className="inp"
            value={form.tagsText}
            onChange={(event) => updateForm('tagsText', event.target.value)}
            placeholder="مثال: تاريخ, سهل, جماعي"
          />
          {!!tagChips.length && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {tagChips.map((tag) => (
                <span key={tag} className="tag tg">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {(liveDuplicate || liveQualityWarnings.length > 0) && (
          <div
            className="ann"
            style={{
              background: 'rgba(240,192,64,.08)',
              border: '1px solid rgba(240,192,64,.25)',
              color: COLORS.gold,
            }}
          >
            {liveDuplicate && (
              <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.6 }}>
                قد يكون السؤال مكررًا مع: {truncateText(liveDuplicate.question_text, 70)}
              </div>
            )}
            {!!liveQualityWarnings.length && (
              <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.6, marginTop: liveDuplicate ? 5 : 0 }}>
                تنبيهات الجودة: {liveQualityWarnings.join('، ')}
              </div>
            )}
          </div>
        )}

        {!editingId && (
          <label
            style={{
              ...styles.checkboxPill,
              width: '100%',
              marginBottom: 10,
              justifyContent: 'flex-start',
              ...selectablePillStyle(keepDefaults),
            }}
          >
            <input
              type="checkbox"
              checked={keepDefaults}
              onChange={(event) => setKeepDefaults(event.target.checked)}
              style={{ accentColor: COLORS.gold }}
            />
            تثبيت التصنيف والصعوبة ونوع السؤال والفئة والألعاب للسؤال القادم
          </label>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn bg" disabled={saving} style={{ flex: 2, minWidth: 150 }}>
            {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'حفظ واعتماد السؤال'}
          </button>
          {!editingId && (
            <button
              type="button"
              className="btn bb"
              disabled={saving}
              style={{ flex: 1.5, minWidth: 150 }}
              onClick={(event) => handleSubmit(event, { continueEntry: true })}
            >
              حفظ وإضافة سؤال آخر
            </button>
          )}
          <button type="button" className="btn bgh" onClick={resetForm} disabled={saving} style={{ flex: 1, minWidth: 110 }}>
            تفريغ
          </button>
        </div>
      </form>
      </>
    );
  }

  function renderPendingTab() {
    return (
      <div className="card">
        <div className="ctitle">المقترحات بانتظار الموافقة ({pendingQuestions.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 8, marginBottom: 12 }}>
          {renderStatCard('إجمالي المقترحات', pendingStats.total, COLORS.gold)}
          {renderStatCard('سهل', pendingStats.easy, COLORS.green)}
          {renderStatCard('متوسط', pendingStats.medium, COLORS.blue)}
          {renderStatCard('صعب', pendingStats.hard, COLORS.red)}
        </div>
        {loading && <div style={styles.emptyState}>جاري تحميل المقترحات...</div>}
        {!loading && pendingQuestions.length === 0 && <div style={styles.emptyState}>لا توجد مقترحات معلقة</div>}
        {!loading && pendingQuestions.map((question) => {
          const awaitingClass = communityNeedsClassification(question);
          return (
          <div key={question.id} className="card2" style={{ borderColor: 'rgba(240,192,64,.26)' }}>
            <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.7, color: 'var(--text)' }}>
              {question.question_text || '—'}
            </div>
            {question.correct_answer ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                الإجابة: <span style={{ color: 'var(--text-soft)' }}>{question.correct_answer}</span>
              </div>
            ) : null}
            {question.type === 'multiple_choice' && Array.isArray(question.options) && question.options.length > 0 ? (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
                الخيارات: {question.options.join(' · ')}
              </div>
            ) : null}
            {question.type === 'written_text' && question.supervisor_notes ? (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
                ملاحظات المشرف: <span style={{ color: 'var(--text-soft)' }}>{question.supervisor_notes}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={badgeStyle(COLORS.gold)}>{TYPE_LABELS[question.type] || question.type || '—'}</span>
              {awaitingClass ? (
                <span style={badgeStyle(COLORS.gold)}>بانتظار التصنيف</span>
              ) : (
                <>
                  <span style={badgeStyle(COLORS.blue)}>{CATEGORY_LABELS[question.category] || question.category}</span>
                  <span style={badgeStyle(getDifficultyColor(question.difficulty_level))}>
                    {DIFFICULTY_LABELS[question.difficulty_level] || question.difficulty_level}
                  </span>
                  <span style={badgeStyle(COLORS.purple)}>
                    {AUDIENCE_LABELS[question.audience || 'general'] || 'عام'}
                  </span>
                </>
              )}
              <span style={badgeStyle(COLORS.muted)}>
                {question.source === QB_SOURCE.COMMUNITY ? '👥 مجتمع' : '🛠️ أدمن'}
              </span>
              <span style={badgeStyle(COLORS.purple)}>
                {question.contributor_name || question.created_by || 'system'}
              </span>
            </div>
            {question.rejection_reason ? (
              <div style={{ marginTop: 8, fontSize: 11, color: COLORS.red }}>
                سبب الرفض: {question.rejection_reason}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn bsm bb" onClick={() => handleEditAndApprove(question)}>
                {awaitingClass ? 'تصنيف واعتماد' : 'تعديل واعتماد'}
              </button>
              {!awaitingClass ? (
              <button type="button" className="btn bsm bv" onClick={() => handleApprove(question.id)}>
                موافقة
              </button>
              ) : null}
              <button type="button" className="btn bsm br" onClick={() => handleReject(question.id)}>
                رفض
              </button>
              <button type="button" className="btn bsm bgh" onClick={() => handleDelete(question.id)}>
                حذف
              </button>
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="scr">
      <div className="ptitle">بنك الأسئلة</div>
      <div className="psub">إدارة الأسئلة المركزية للألعاب الجماعية</div>

      {notice && (
        <div
          className="ann"
          style={{
            background: notice.type === 'error' ? 'rgba(230,57,80,.08)' : 'rgba(46,204,113,.08)',
            border: `1px solid ${notice.type === 'error' ? 'rgba(230,57,80,.25)' : 'rgba(46,204,113,.25)'}`,
            color: notice.type === 'error' ? COLORS.red : COLORS.green,
          }}
        >
          {notice.message}
        </div>
      )}

      {error && (
        <div className="ann ar" style={{ color: COLORS.red }}>
          {error.message || 'حدث خطأ أثناء تحميل بنك الأسئلة'}
        </div>
      )}

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'questions' ? 'on' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          الأسئلة
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'add' ? 'on' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          إضافة سؤال
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'pending' ? 'on' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          المقترحات
        </button>
      </div>

      {activeTab === 'questions' && renderQuestionsTab()}
      {activeTab === 'add' && renderFormTab()}
      {activeTab === 'pending' && renderPendingTab()}
    </div>
  );
}

const styles = {
  emptyState: {
    padding: '18px 12px',
    borderRadius: 12,
    background: 'var(--surface)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--muted)',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  checkboxPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid var(--border-subtle)',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  optionRow: {
    display: 'grid',
    gridTemplateColumns: 'auto auto 1fr',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    border: '1px solid var(--border-subtle)',
  },
  optionLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 9,
    background: 'rgba(240,192,64,.11)',
    color: COLORS.gold,
    fontWeight: 900,
    fontFamily: 'Cairo, sans-serif',
  },
  statCard: {
    padding: '10px 8px',
    borderRadius: 12,
    background: 'var(--surface)',
    border: '1px solid var(--border-subtle)',
    textAlign: 'center',
  },
};
