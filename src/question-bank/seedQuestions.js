// RUN ONCE — import in browser console or temp button

import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { suggestQuestion } from './qbank.helpers';

const SAMPLE_QUESTIONS = [
  {
    category: 'religious',
    difficulty_level: 'easy',
    type: 'multiple_choice',
    question_text: 'ما هو أول شهر في السنة الهجرية؟',
    correct_answer: 'محرم',
    options: ['محرم', 'رمضان', 'رجب', 'ذو الحجة'],
    gameTypes: ['qumayri', 'all'],
    audience: 'family',
    tags: ['دين', 'تقويم هجري', 'سهل'],
  },
  {
    category: 'religious',
    difficulty_level: 'easy',
    type: 'multiple_choice',
    question_text: 'كم عدد الصلوات المفروضة في اليوم؟',
    correct_answer: 'خمس صلوات',
    options: ['ثلاث صلوات', 'أربع صلوات', 'خمس صلوات', 'ست صلوات'],
    gameTypes: ['qumayri', 'all'],
    audience: 'family',
    tags: ['دين', 'صلاة', 'سهل'],
  },
  {
    category: 'religious',
    difficulty_level: 'easy',
    type: 'multiple_choice',
    question_text: 'ما اسم الكتاب المقدس في الإسلام؟',
    correct_answer: 'القرآن الكريم',
    options: ['القرآن الكريم', 'الزبور', 'التوراة', 'الإنجيل'],
    gameTypes: ['qumayri', 'all'],
    audience: 'family',
    tags: ['دين', 'قرآن', 'سهل'],
  },
  {
    category: 'geography',
    difficulty_level: 'medium',
    type: 'true_false',
    question_text: 'تقع مدينة الرياض في وسط المملكة العربية السعودية.',
    correct_answer: 'صح',
    options: [],
    gameTypes: ['all'],
    audience: 'general',
    tags: ['جغرافيا', 'السعودية', 'مدن'],
  },
  {
    category: 'geography',
    difficulty_level: 'medium',
    type: 'true_false',
    question_text: 'نهر النيل يمر عبر قارة أوروبا.',
    correct_answer: 'خطأ',
    options: [],
    gameTypes: ['all'],
    audience: 'general',
    tags: ['جغرافيا', 'أنهار', 'إفريقيا'],
  },
  {
    category: 'geography',
    difficulty_level: 'medium',
    type: 'true_false',
    question_text: 'اليابان دولة مكونة من جزر.',
    correct_answer: 'صح',
    options: [],
    gameTypes: ['all'],
    audience: 'general',
    tags: ['جغرافيا', 'آسيا', 'جزر'],
  },
  {
    category: 'animals',
    difficulty_level: 'hard',
    type: 'multiple_choice',
    question_text: 'أي الحيوانات التالية يستطيع تغيير لونه للتمويه؟',
    correct_answer: 'الحرباء',
    options: ['الحرباء', 'الغزال', 'النعامة', 'الذئب'],
    gameTypes: ['qumayri'],
    audience: 'general',
    tags: ['حيوانات', 'تمويه', 'صعب'],
  },
  {
    category: 'animals',
    difficulty_level: 'hard',
    type: 'multiple_choice',
    question_text: 'ما الحيوان المعروف بأنه ينام واقفاً لفترات قصيرة؟',
    correct_answer: 'الحصان',
    options: ['الحصان', 'الأسد', 'الأرنب', 'الدب'],
    gameTypes: ['qumayri'],
    audience: 'general',
    tags: ['حيوانات', 'سلوك حيواني', 'صعب'],
  },
  {
    category: 'general',
    difficulty_level: 'easy',
    type: 'open_question',
    question_text: 'ما لون السماء في يوم صاف غالباً؟',
    correct_answer: 'أزرق',
    options: [],
    gameTypes: ['all'],
    audience: 'kids',
    tags: ['عام', 'ألوان', 'سهل'],
  },
  {
    category: 'general',
    difficulty_level: 'easy',
    type: 'open_question',
    question_text: 'كم عدد أيام الأسبوع؟',
    correct_answer: 'سبعة أيام',
    options: [],
    gameTypes: ['all'],
    audience: 'kids',
    tags: ['عام', 'وقت', 'سهل'],
  },
];

export async function seedQBankData() {
  const createdQuestions = [];

  for (const question of SAMPLE_QUESTIONS) {
    const createdAt = Date.now();
    const created = await suggestQuestion({
      ...question,
      status: 'approved',
      created_by: 'system',
      createdAt,
    });

    await update(ref(db, `question-bank/${created.id}`), {
      status: 'approved',
      created_by: 'system',
      createdAt,
    });

    createdQuestions.push(created);
  }

  console.log(`✅ Seeded ${createdQuestions.length} questions`);
  return createdQuestions;
}
