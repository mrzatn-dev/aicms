export type LocaleCode = 'ru' | 'en' | 'kk';

type HomePage = {
    tagline: string;
    mainTitle: string;
    mainTitleHighlight: string;
    description: string;
    startFree: string;
    login: string;
    aiTools: string;
    aiToolsDescription: string;
    tools: {
        chat: {
            title: string;
            description: string;
        };
        validate: {
            title: string;
            description: string;
        };
        document: {
            title: string;
            description: string;
        };
        csv: {
            title: string;
            description: string;
        };
        image: {
            title: string;
            description: string;
        };
        audio: {
            title: string;
            description: string;
        };
        articles: {
            title: string;
            description: string;
        };
    };
    whyOurAi: string;
    whyDescription: string;
    benefits: string[];
    aiAssistant: string;
    online: string;
    hello: string;
    analyzeThis: string;
    sureHelpful: string;
    enterMessage: string;
    howItWorks: string;
    howItWorksDescription: string;
    steps: {
        upload: {
            number: string;
            title: string;
            description: string;
        };
        process: {
            number: string;
            title: string;
            description: string;
        };
        receive: {
            number: string;
            title: string;
            description: string;
        };
    };
    getStarted: string;
    ready: string;
    createAccount: string;
    readBlog: string;
    allLanguages: Record<LocaleCode, string>;
};

const homePage: Record<LocaleCode, HomePage> = {
    ru: {
        tagline: 'AI-ассистент для работы с контентом',
        mainTitle: 'AI-инструменты для',
        mainTitleHighlight: 'работы с данными',
        description: 'Анализ документов, CSV и изображений с помощью искусственного интеллекта. AI-чат для помощи с текстами и валидация контента — всё в одном месте.',
        startFree: 'Начать бесплатно',
        login: 'Войти',
        aiTools: 'AI-инструменты',
        aiToolsDescription: 'Все инструменты работают на базе DeepSeek — мощной языковой модели для анализа и генерации текста.',
        tools: {
            chat: {
                title: 'AI Чат',
                description: 'Задавайте вопросы AI-ассистенту. Получайте помощь с текстами, анализом и генерацией идей.',
            },
            validate: {
                title: 'Проверка контента',
                description: 'AI-валидатор проверяет качество текста, находит ошибки и даёт рекомендации по улучшению.',
            },
            document: {
                title: 'Анализ документов',
                description: 'Загружайте PDF, TXT, DOCX. Получайте AI-резюме, оценку качества и структурный анализ.',
            },
            csv: {
                title: 'Анализ CSV',
                description: 'Проверяйте данные CSV на аномалии, пропущенные значения и статистические несоответствия.',
            },
            image: {
                title: 'Анализ изображений',
                description: 'Оценивайте качество изображений: разрешение, формат, цветовой режим, пригодность для публикации.',
            },
            audio: {
                title: 'Анализ аудио',
                description: 'Транскрибируйте аудиофайлы, получайте резюме, выделяйте ключевые темы и анализируйте качество звука.',
            },
            articles: {
                title: 'Статьи и блог',
                description: 'Публикуйте материалы после AI-проверки. Читайте опубликованные статьи в открытом блоге.',
            },
        },
        whyOurAi: 'Почему наш AI?',
        whyDescription: 'Все данные обрабатываются локально через наш API. Не нужно отправлять конфиденциальные документы в сторонние сервисы — всё работает в вашей инфраструктуре.',
        benefits: [
            'AI-ассистент для всех задач',
            'Проверка документов (PDF, TXT, DOCX)',
            'Анализ данных CSV',
            'Оценка качества изображений',
            'Анализ аудио и транскрибация',
            'Валидация контента',
            'Публикация статей в блоге',
            'Безопасное хранение данных',
        ],
        aiAssistant: 'AI Ассистент',
        online: 'Онлайн',
        hello: 'Привет! Я AI-ассистент. Чем могу помочь?',
        analyzeThis: 'Проанализируй этот PDF документ',
        sureHelpful: 'Конечно! Загрузите документ и я извлеку ключевую информацию, проверю качество текста и дам рекомендации.',
        enterMessage: 'Введите сообщение...',
        howItWorks: 'Как это работает',
        howItWorksDescription: 'Простой процесс от загрузки файла до получения AI-анализа',
        steps: {
            upload: {
                number: '1',
                title: 'Загрузите файл',
                description: 'Выберите документ, CSV, изображение или аудиофайл для анализа',
            },
            process: {
                number: '2',
                title: 'Обработка AI',
                description: 'Наш AI анализирует содержимое и выявляет ключевую информацию',
            },
            receive: {
                number: '3',
                title: 'Получите результат',
                description: 'Полный анализ, рекомендации и информация о качестве за несколько секунд',
            },
        },
        getStarted: 'Начните работать с AI сегодня',
        ready: 'Готовы к переменам?',
        createAccount: 'Создайте учётную запись бесплатно и начните использовать AI-инструменты прямо сейчас.',
        readBlog: 'Читать блог',
        allLanguages: {
            ru: 'Русский',
            en: 'English',
            kk: 'Қазақ',
        },
    },
    en: {
        tagline: 'AI assistant for content management',
        mainTitle: 'AI tools for',
        mainTitleHighlight: 'working with data',
        description: 'Analyze documents, CSV files and images with artificial intelligence. AI chat for text assistance and content validation — all in one place.',
        startFree: 'Get Started Free',
        login: 'Log In',
        aiTools: 'AI Tools',
        aiToolsDescription: 'All tools are powered by DeepSeek — a powerful language model for text analysis and generation.',
        tools: {
            chat: {
                title: 'AI Chat',
                description: 'Ask questions to the AI assistant. Get help with texts, analysis, and idea generation.',
            },
            validate: {
                title: 'Content Validation',
                description: 'AI validator checks text quality, finds errors, and provides improvement recommendations.',
            },
            document: {
                title: 'Document Analysis',
                description: 'Upload PDF, TXT, DOCX. Get AI summaries, quality assessment, and structural analysis.',
            },
            csv: {
                title: 'CSV Analysis',
                description: 'Check CSV data for anomalies, missing values, and statistical inconsistencies.',
            },
            image: {
                title: 'Image Analysis',
                description: 'Evaluate image quality: resolution, format, color mode, and publication suitability.',
            },
            audio: {
                title: 'Audio Analysis',
                description: 'Transcribe audio files, get summaries, identify key topics, and analyze sound quality.',
            },
            articles: {
                title: 'Articles & blog',
                description: 'Publish content after AI review. Read published posts on the public blog.',
            },
        },
        whyOurAi: 'Why Our AI?',
        whyDescription: 'All data is processed locally through our API. No need to send confidential documents to third-party services — everything works in your infrastructure.',
        benefits: [
            'AI assistant for all tasks',
            'Document verification (PDF, TXT, DOCX)',
            'CSV data analysis',
            'Image quality assessment',
            'Audio analysis and transcription',
            'Content validation',
            'Article publishing & blog',
            'Secure data storage',
        ],
        aiAssistant: 'AI Assistant',
        online: 'Online',
        hello: 'Hello! I\'m your AI assistant. How can I help?',
        analyzeThis: 'Analyze this PDF document',
        sureHelpful: 'Sure! Upload the document and I will extract key information, check text quality, and provide recommendations.',
        enterMessage: 'Enter message...',
        howItWorks: 'How It Works',
        howItWorksDescription: 'Simple process from file upload to AI analysis results',
        steps: {
            upload: {
                number: '1',
                title: 'Upload Your File',
                description: 'Select a document, CSV, image, or audio file for analysis',
            },
            process: {
                number: '2',
                title: 'AI Processing',
                description: 'Our AI analyzes the content and identifies key information',
            },
            receive: {
                number: '3',
                title: 'Get Results',
                description: 'Complete analysis, recommendations, and quality information in seconds',
            },
        },
        getStarted: 'Start Working with AI Today',
        ready: 'Ready for Change?',
        createAccount: 'Create a free account and start using AI tools right now.',
        readBlog: 'Read blog',
        allLanguages: {
            ru: 'Русский',
            en: 'English',
            kk: 'Қазақ',
        },
    },
    kk: {
        tagline: 'Контент басқару үшін AI көмекші',
        mainTitle: 'AI құралдары',
        mainTitleHighlight: 'деректермен жұмыс істеу үшін',
        description: 'Құжаттарды, CSV файлдарын және кескіндерді жасанды интеллект көмегімен талдаңыз. Мәтін көмегі үшін AI чаты және контент тексерісі — барлығы бір жерде.',
        startFree: 'Бесплатно басыңыз',
        login: 'Кіру',
        aiTools: 'AI құралдары',
        aiToolsDescription: 'Барлық құралдар DeepSeek - мәтін талдау және генерациялау үшін күшті тіл моделі арқасында жұмыс істейді.',
        tools: {
            chat: {
                title: 'AI Чат',
                description: 'AI көмекшіге сұрақтар қойыңыз. Мәтіндер, талдау және идея генерациясында көмек алыңыз.',
            },
            validate: {
                title: 'Контент тексерісі',
                description: 'AI тексерушісі мәтін сапасын тексеріп, қателерді табады және жақсарту ұсыныстарын береді.',
            },
            document: {
                title: 'Құжаттарды талдау',
                description: 'PDF, TXT, DOCX жүктеңіз. AI қысқартпасын, сапа бағалауын және құрылымдық талдауын алыңыз.',
            },
            csv: {
                title: 'CSV талдауы',
                description: 'CSV деректерінде аномалияларды, жетіспеген мәндерді және статистикалық сәйкессіздіктерді тексеріңіз.',
            },
            image: {
                title: 'Кескін талдауы',
                description: 'Кескін сапасын бағалаңыз: ажырату қабілеті, пішімі, түс режимі және ауыстырмалау пайдалылығы.',
            },
            audio: {
                title: 'Аудио талдауы',
                description: 'Аудиофайлдарды транскрибтеңіз, қысқартпаларды алыңыз, негізгі тақырыптарды анықтаңыз және дыбыс сапасын талдаңыз.',
            },
            articles: {
                title: 'Мақалалар және блог',
                description: 'AI тексерісінен кейін материалдарды жариялаңыз. Жарияланған мақалаларды блогта оқыңыз.',
            },
        },
        whyOurAi: 'Неге біздің AI?',
        whyDescription: 'Барлық деректер біздің API арқасында локальды түрде өңделеді. Құпиялы құжаттарды үшінші тарапқа жіберудің қажеті жоқ — барлығы өзімізің инфрақұрылымында жұмыс істейді.',
        benefits: [
            'Барлық тапсырмалар үшін AI көмекші',
            'Құжатты тексеру (PDF, TXT, DOCX)',
            'CSV деректерін талдау',
            'Кескін сапасын бағалау',
            'Аудио талдау және транскрипция',
            'Контент тексерісі',
            'Мақалаларды блогта жариялау',
            'Қауіпсіз деректер сақтау',
        ],
        aiAssistant: 'AI Көмекші',
        online: 'Онлайн',
        hello: 'Сәлем! Мен AI көмекшісіне өйтіржінсіңіз. Мен сізге қалай көмектесе аламын?',
        analyzeThis: 'Осы PDF құжатын талдаңыз',
        sureHelpful: 'Құрметі! Құжатты жүктеңіз және мен негізгі ақпаратты шығарып, мәтін сапасын тексеріп, ұсыныстар беремін.',
        enterMessage: 'Хабарлама енгізіңіз...',
        howItWorks: 'Бұл қалай жұмыс істейді',
        howItWorksDescription: 'Файлды жүктеуден AI талдау нәтижелеріне дейін қарапайым процесс',
        steps: {
            upload: {
                number: '1',
                title: 'Файлды жүктеңіз',
                description: 'Талдау үшін құжатты, CSV-ді, кескінді немесе аудиофайлды таңдаңыз',
            },
            process: {
                number: '2',
                title: 'AI өңдеуі',
                description: 'Біздің AI контентті талдайды және негізгі ақпаратты анықтайды',
            },
            receive: {
                number: '3',
                title: 'Нәтижелерді алыңыз',
                description: 'Толық талдау, ұсыныстар және бірнеше секундта сапа ақпараты',
            },
        },
        getStarted: 'Бүгін AI-мен жұмыс істегіңіз',
        ready: 'Өзгеруге дайынсыз ба?',
        createAccount: 'Бесплатты аккаунт құрыңыз және AI құралдарын қалай қолданыңыз.',
        readBlog: 'Блогты оқу',
        allLanguages: {
            ru: 'Русский',
            en: 'English',
            kk: 'Қазақ',
        },
    },
};

export function getHomePageCopy(locale: LocaleCode): HomePage {
    return homePage[locale];
}

export function getLocaleTag(locale: LocaleCode): string {
    const tags: Record<LocaleCode, string> = {
        ru: 'ru-RU',
        en: 'en-US',
        kk: 'kk-KZ',
    };
    return tags[locale];
}

export const LOCALES: LocaleCode[] = ['ru', 'en', 'kk'];
