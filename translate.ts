require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.API_GOOGLE_KEY;
const regex =
  /return this\.(responses|response|responseServices)\.[a-zA-Z_]+\(\s*res,\s*'([^']+)'|throw new \w+\(\s*'([^']+)'(?:\s*,\s*[^)]*)?\s*\)|message:\s*'([^']+)'/g;

const languages = [
  { name: 'English', code: 'en' },
  { name: 'Arabic', code: 'ar' },
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function extractMessages(directory) {
  const files = getAllFiles(directory);

  const messages = {};

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    // if (file.includes('variation.controller')) {
    //   console.log(content);
    // }
    while ((match = regex.exec(content)) !== null) {
      if (file.includes('variation.controller')) {
      }
      const message = match[2] || match[3];
      messages[message] = message;
    }
  });

  return messages;
}

async function translateText(text, targetLang, attempt = 0) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Translate this to ${targetLang}: ${text}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    if (error.status === 429 && attempt < 5) {
      const delay = Math.min(2000 * 2 ** attempt, 30000);
      console.warn(`Rate limited. Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return translateText(text, targetLang, attempt + 1);
    }
    console.error(
      `Error translating "${text}" to ${targetLang}:`,
      error.message,
    );
    return text;
  }
}

async function generateTranslations(messages, lang, existingTranslations) {
  const newTranslations = {};

  for (const key of Object.keys(messages)) {
    if (!existingTranslations.hasOwnProperty(key)) {
      newTranslations[key] = await translateText(messages[key], lang);
      console.log(`✅ Translated: "${key}" → "${newTranslations[key]}"`);
    }
  }

  return { ...existingTranslations, ...newTranslations };
}

(async () => {
  const directoryPath = path.resolve(`${__dirname}/src`);
  const extractedMessages = extractMessages(directoryPath);
  for (const { code, name } of languages) {
    const dirPath = path.join(__dirname, '/i18n', code);
    const filePath = path.join(dirPath, 'response.json');

    // تحميل الترجمات القديمة إن وجدت
    let existingTranslations = {};
    if (fs.existsSync(filePath)) {
      existingTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    // ترجمة الرسائل الجديدة فقط
    const updatedTranslations = await generateTranslations(
      extractedMessages,
      name,
      existingTranslations,
    );

    // حفظ التعديلات
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updatedTranslations, null, 2));

    console.log(`✅ Translations updated in: ${filePath}`);
  }
})();