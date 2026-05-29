import type { LocaleCode } from './types';

type Copy = {
    sidebar: Record<string, string>;
    quickActions: Record<string, { title: string; desc: string }>;
    topbar: {
        dashboard: string;
        admin: string;
        user: string;
    };
    home: {
        welcome: string;
        subtitle: string;
        quickAccess: string;
        aiTools: string;
        status: string;
        active: string;
        aiModel: string;
    };
    profile: {
        title: string;
        fullName: string;
        email: string;
        role: string;
        admin: string;
        user: string;
        registeredAt: string;
        username: string;
        save: string;
        saving: string;
        cancel: string;
    };
    chat: {
        title: string;
        online: string;
        clear: string;
        placeholder: string;
    };
    validate: {
        title: string;
        subtitle: string;
        heading: string;
        content: string;
        headingPlaceholder: string;
        contentPlaceholder: string;
        submit: string;
        submitting: string;
        score: string;
        passed: string;
        hasIssues: string;
        reset: string;
        issues: string;
        suggestions: string;
    };
    document: {
        title: string;
        subtitle: string;
        uploadPrompt: string;
        supported: string;
        analyze: string;
        analyzing: string;
        new: string;
        quality: string;
        words: string;
        type: string;
        summary: string;
        recommendations: string;
        warnings: string;
    };
    csv: {
        title: string;
        subtitle: string;
        uploadPrompt: string;
        maxSize: string;
        analyze: string;
        analyzing: string;
        new: string;
        rows: string;
        columns: string;
        quality: string;
        completeness: string;
        summary: string;
        anomalies: string;
        recommendations: string;
    };
    image: {
        title: string;
        subtitle: string;
        uploadPrompt: string;
        supported: string;
        analyze: string;
        analyzing: string;
        new: string;
        suitable: string;
        notRecommended: string;
        size: string;
        file: string;
        format: string;
        color: string;
        assessment: string;
        recommendations: string;
        warnings: string;
    };
    audio: {
        title: string;
        subtitle: string;
        uploadPrompt: string;
        supported: string;
        analyze: string;
        analyzing: string;
        new: string;
        duration: string;
        format: string;
        language: string;
        model: string;
        summary: string;
        topics: string;
        transcript: string;
        noTranscript: string;
        confidence: string;
        safetyTitle: string;
        safe: string;
        unsafe: string;
        riskScore: string;
        riskCategories: string;
    };
    history: {
        title: string;
        empty: string;
        emptyHint: string;
        exportPdf: string;
        delete: string;
        page: string;
        of: string;
        untitled: string;
        filters: Record<string, string>;
    };
    statistics: {
        empty: string;
        total: string;
        week: string;
        month: string;
        favorite: string;
        usage: string;
        noUsage: string;
        recent: string;
        untitled: string;
        times: string;
        liveTitle: string;
        liveSubtitle: string;
        noLive: string;
        level: string;
    };
    monitor: {
        title: string;
        subtitle: string;
        empty: string;
        servicesHealthy: string;
        queueBacklog: string;
        redisState: string;
        refreshedAt: string;
        serviceHealth: string;
        redisCache: string;
        queues: string;
        host: string;
        database: string;
        cacheConnected: string;
        cacheKeys: string;
        sampleKeys: string;
        latency: string;
        httpStatus: string;
        messages: string;
        ready: string;
        unacked: string;
        consumers: string;
        state: string;
        statuses: Record<string, string>;
    };
    settings: {
        prompts: string;
        chatPrompt: string;
        validationPrompt: string;
        documentPrompt: string;
        chatPlaceholder: string;
        validationPlaceholder: string;
        documentPlaceholder: string;
        modelSettings: string;
        model: string;
        maxTokens: string;
        temperatureHint: string;
        interface: string;
        theme: string;
        language: string;
        light: string;
        dark: string;
        fontSize: string;
        compact: string;
        compactHint: string;
        save: string;
        saving: string;
        languages: Record<LocaleCode, string>;
        fontSizes: Record<string, string>;
    };
    support: {
        center: string;
        inbox: string;
        centerSubtitle: string;
        inboxSubtitle: string;
        subject: string;
        createPlaceholder: string;
        create: string;
        creating: string;
        noUserConversations: string;
        noAdminConversations: string;
        choose: string;
        createFirst: string;
        conversationHint: string;
        supportReplyHint: string;
        selectConversation: string;
        noMessages: string;
        replyAdmin: string;
        replyUser: string;
        statuses: Record<'open' | 'in_progress' | 'closed', string>;
        userFallback: string;
        adminLabel: string;
        userLabel: string;
    };
};

const copy: Record<LocaleCode, Copy> = {
    ru: {
        sidebar: {
            home: 'Главная',
            profile: 'Профиль',
            history: 'История',
            settings: 'Настройки',
            statistics: 'Статистика',
            admin_control: 'Admin Control',
            system_monitor: 'System Monitor',
            support: 'Поддержка',
            support_admin: 'Support Inbox',
            chat: 'AI Чат',
            validate: 'Проверка контента',
            document: 'Анализ документов',
            csv: 'Анализ CSV',
            image: 'Анализ изображений',
            audio: 'Анализ аудио',
        },
        quickActions: {
            chat: { title: 'AI Чат', desc: 'Задать вопрос боту' },
            validate: { title: 'Проверить текст', desc: 'AI валидация' },
            document: { title: 'Проверить документ', desc: 'PDF, TXT, DOCX' },
            csv: { title: 'Анализ CSV', desc: 'Проверка данных' },
            image: { title: 'Проверить изображение', desc: 'AI анализ качества' },
            audio: { title: 'Проверить аудио', desc: 'Транскрибация и резюме' },
        },
        topbar: { dashboard: 'Панель', admin: 'Администратор', user: 'Пользователь' },
        home: {
            welcome: 'Добро пожаловать, {name}!',
            subtitle: 'Ваш единый центр управления контентом. Используйте AI-инструменты для создания, проверки и анализа материалов в одном месте.',
            quickAccess: 'Быстрый доступ',
            aiTools: 'AI инструментов',
            status: 'Статус',
            active: 'Активен',
            aiModel: 'AI Модель',
        },
        profile: {
            title: 'Информация профиля',
            fullName: 'Полное имя',
            email: 'Email',
            role: 'Роль',
            admin: 'Администратор',
            user: 'Пользователь',
            registeredAt: 'Дата регистрации',
            username: 'Имя пользователя',
            save: 'Сохранить',
            saving: 'Сохранение...',
            cancel: 'Отмена',
        },
        chat: {
            title: 'AI Ассистент',
            online: 'Онлайн',
            clear: 'Очистить',
            placeholder: 'Напишите сообщение... (Enter для отправки)',
        },
        validate: {
            title: 'Проверка контента',
            subtitle: 'AI анализ качества текста',
            heading: 'Заголовок',
            content: 'Содержание',
            headingPlaceholder: 'Введите заголовок статьи',
            contentPlaceholder: 'Введите текст статьи',
            submit: 'Проверить',
            submitting: 'Проверка...',
            score: 'Оценка',
            passed: 'Контент прошел проверку',
            hasIssues: 'Есть проблемы',
            reset: 'Новая проверка',
            issues: 'Проблемы',
            suggestions: 'Рекомендации',
        },
        document: {
            title: 'Анализ документа',
            subtitle: 'PDF, TXT, DOCX (до 20 MB)',
            uploadPrompt: 'Нажмите или перетащите файл',
            supported: 'Поддерживаются: TXT, PDF, DOCX',
            analyze: 'Анализировать',
            analyzing: 'Анализ...',
            new: 'Новый',
            quality: 'Качество',
            words: 'Слов',
            type: 'Тип',
            summary: 'AI Резюме',
            recommendations: 'Рекомендации',
            warnings: 'Предупреждения',
        },
        csv: {
            title: 'Анализ CSV',
            subtitle: 'Проверка данных и качества',
            uploadPrompt: 'Нажмите или перетащите CSV',
            maxSize: 'Максимум 10 MB',
            analyze: 'Анализировать',
            analyzing: 'Анализ...',
            new: 'Новый',
            rows: 'Строк',
            columns: 'Колонок',
            quality: 'Качество',
            completeness: 'Полнота',
            summary: 'AI Резюме',
            anomalies: 'Аномалии',
            recommendations: 'Рекомендации',
        },
        image: {
            title: 'Анализ изображения',
            subtitle: 'JPG, PNG, WebP, GIF (до 15 MB)',
            uploadPrompt: 'Нажмите или перетащите изображение',
            supported: 'JPG, PNG, WebP, GIF • до 15 MB',
            analyze: 'Анализировать',
            analyzing: 'Анализ...',
            new: 'Новый',
            suitable: 'Подходит',
            notRecommended: 'Не рекомендуется',
            size: 'Размер',
            file: 'Файл',
            format: 'Формат',
            color: 'Цвет',
            assessment: 'AI Оценка',
            recommendations: 'Рекомендации',
            warnings: 'Предупреждения',
        },
        audio: {
            title: 'Анализ аудио',
            subtitle: 'MP3, WAV, M4A, FLAC, AAC, OGG (до 100 MB)',
            uploadPrompt: 'Нажмите или перетащите аудиофайл',
            supported: 'Доступны транскрибация, краткое резюме и ключевые темы',
            analyze: 'Транскрибировать',
            analyzing: 'Обработка...',
            new: 'Новый',
            duration: 'Длительность',
            format: 'Формат',
            language: 'Язык',
            model: 'Модель',
            summary: 'Краткое резюме',
            topics: 'Ключевые темы',
            transcript: 'Транскрипт',
            noTranscript: 'Транскрипт пока пуст.',
            confidence: 'Уверенность',
            safetyTitle: 'Проверка на вредоносность',
            safe: 'Аудио выглядит безопасным',
            unsafe: 'Обнаружен потенциально опасный контент',
            riskScore: 'Риск',
            riskCategories: 'Категории риска',
        },
        history: {
            title: 'История AI анализов',
            empty: 'История пуста',
            emptyHint: 'Начните использовать AI инструменты',
            exportPdf: 'Экспорт в PDF',
            delete: 'Удалить',
            page: 'Страница',
            of: 'из',
            untitled: 'Без названия',
            filters: {
                all: 'Все инструменты',
                chat: 'AI Чат',
                validation: 'Проверка контента',
                document_analysis: 'Анализ документов',
                csv_analysis: 'Анализ CSV',
                image_analysis: 'Анализ изображений',
                audio_transcription: 'Анализ аудио',
            },
        },
        statistics: {
            empty: 'Нет данных для отображения',
            total: 'Всего анализов',
            week: 'За неделю',
            month: 'За месяц',
            favorite: 'Любимый инструмент',
            usage: 'Использование по инструментам',
            noUsage: 'Нет данных об использовании',
            recent: 'Недавняя активность',
            untitled: 'Без названия',
            times: 'раз',
            liveTitle: 'Live Activity',
            liveSubtitle: 'Последние события сервисов и пользовательских действий',
            noLive: 'Пока нет событий',
            level: 'Уровень',
        },
        monitor: {
            title: 'System Monitor',
            subtitle: 'Состояние сервисов, очередей RabbitMQ и Redis-кэша в одном месте',
            empty: 'Мониторинг пока недоступен',
            servicesHealthy: 'Здоровые сервисы',
            queueBacklog: 'Сообщений в очередях',
            redisState: 'Redis статус',
            refreshedAt: 'Обновлено',
            serviceHealth: 'Health сервисов',
            redisCache: 'Redis cache status',
            queues: 'Очереди RabbitMQ',
            host: 'Хост',
            database: 'DB',
            cacheConnected: 'Соединение',
            cacheKeys: 'Ключей analytics:*',
            sampleKeys: 'Примеры ключей',
            latency: 'Задержка',
            httpStatus: 'HTTP',
            messages: 'Всего',
            ready: 'Ready',
            unacked: 'Unacked',
            consumers: 'Consumers',
            state: 'State',
            statuses: {
                healthy: 'Healthy',
                degraded: 'Degraded',
                disabled: 'Disabled',
                missing: 'Missing',
                offline: 'Offline',
            },
        },
        settings: {
            prompts: 'Кастомные промпты',
            chatPrompt: 'Системный промпт для чата',
            validationPrompt: 'Промпт для валидации',
            documentPrompt: 'Промпт для анализа документов',
            chatPlaceholder: 'Введите системный промпт для AI чата...',
            validationPlaceholder: 'Введите промпт для проверки контента...',
            documentPlaceholder: 'Введите промпт для анализа документов...',
            modelSettings: 'Настройки AI модели',
            model: 'Модель',
            maxTokens: 'Max токенов',
            temperatureHint: '0 = точные ответы, 2 = креативные ответы',
            interface: 'Интерфейс',
            theme: 'Тема',
            language: 'Язык',
            light: 'Светлая',
            dark: 'Тёмная',
            fontSize: 'Размер интерфейса',
            compact: 'Компактный режим',
            compactHint: 'Уменьшает отступы в шапке и контенте',
            save: 'Сохранить настройки',
            saving: 'Сохранение...',
            languages: { ru: 'Русский', en: 'English', kk: 'Қазақша' },
            fontSizes: { sm: 'Компактный', md: 'Стандартный', lg: 'Крупный' },
        },
        support: {
            center: 'Центр поддержки',
            inbox: 'Support Inbox',
            centerSubtitle: 'Сообщения об ошибках и помощь по системе',
            inboxSubtitle: 'Вопросы пользователей и ответы администратора',
            subject: 'Тема обращения',
            createPlaceholder: 'Опишите ошибку или проблему...',
            create: 'Создать обращение',
            creating: 'Отправка...',
            noUserConversations: 'У вас пока нет обращений.',
            noAdminConversations: 'Пока нет обращений от пользователей.',
            choose: 'Выберите обращение слева',
            createFirst: 'Создайте первое обращение',
            conversationHint: 'Поддержка ответит вам прямо в этом чате.',
            supportReplyHint: 'Здесь будет переписка с пользователем.',
            selectConversation: 'Выберите обращение слева.',
            noMessages: 'Без сообщений',
            replyAdmin: 'Ответить пользователю...',
            replyUser: 'Напишите сообщение в поддержку...',
            statuses: { open: 'Открыт', in_progress: 'В работе', closed: 'Закрыт' },
            userFallback: 'Пользователь',
            adminLabel: 'Администратор',
            userLabel: 'Пользователь',
        },
    },
    en: {
        sidebar: {
            home: 'Home',
            profile: 'Profile',
            history: 'History',
            settings: 'Settings',
            statistics: 'Statistics',
            admin_control: 'Admin Control',
            system_monitor: 'System Monitor',
            support: 'Support',
            support_admin: 'Support Inbox',
            chat: 'AI Chat',
            validate: 'Content Check',
            document: 'Document Analysis',
            csv: 'CSV Analysis',
            image: 'Image Analysis',
            audio: 'Audio Analysis',
        },
        quickActions: {
            chat: { title: 'AI Chat', desc: 'Ask the bot a question' },
            validate: { title: 'Check text', desc: 'AI validation' },
            document: { title: 'Check document', desc: 'PDF, TXT, DOCX' },
            csv: { title: 'CSV analysis', desc: 'Data quality review' },
            image: { title: 'Check image', desc: 'AI quality review' },
            audio: { title: 'Check audio', desc: 'Transcription and summary' },
        },
        topbar: { dashboard: 'Dashboard', admin: 'Administrator', user: 'User' },
        home: {
            welcome: 'Welcome, {name}!',
            subtitle: 'Your unified content workspace. Use AI tools to create, validate, and analyze materials in one place.',
            quickAccess: 'Quick access',
            aiTools: 'AI tools',
            status: 'Status',
            active: 'Active',
            aiModel: 'AI Model',
        },
        profile: {
            title: 'Profile information',
            fullName: 'Full name',
            email: 'Email',
            role: 'Role',
            admin: 'Administrator',
            user: 'User',
            registeredAt: 'Registration date',
            username: 'Username',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel',
        },
        chat: {
            title: 'AI Assistant',
            online: 'Online',
            clear: 'Clear',
            placeholder: 'Write a message... (Enter to send)',
        },
        validate: {
            title: 'Content validation',
            subtitle: 'AI text quality analysis',
            heading: 'Title',
            content: 'Content',
            headingPlaceholder: 'Enter article title',
            contentPlaceholder: 'Enter article text',
            submit: 'Validate',
            submitting: 'Checking...',
            score: 'Score',
            passed: 'Content passed validation',
            hasIssues: 'Issues found',
            reset: 'New check',
            issues: 'Issues',
            suggestions: 'Suggestions',
        },
        document: {
            title: 'Document analysis',
            subtitle: 'PDF, TXT, DOCX (up to 20 MB)',
            uploadPrompt: 'Click or drag a file here',
            supported: 'Supported: TXT, PDF, DOCX',
            analyze: 'Analyze',
            analyzing: 'Analyzing...',
            new: 'New',
            quality: 'Quality',
            words: 'Words',
            type: 'Type',
            summary: 'AI Summary',
            recommendations: 'Recommendations',
            warnings: 'Warnings',
        },
        csv: {
            title: 'CSV analysis',
            subtitle: 'Data and quality review',
            uploadPrompt: 'Click or drag a CSV file',
            maxSize: 'Maximum 10 MB',
            analyze: 'Analyze',
            analyzing: 'Analyzing...',
            new: 'New',
            rows: 'Rows',
            columns: 'Columns',
            quality: 'Quality',
            completeness: 'Completeness',
            summary: 'AI Summary',
            anomalies: 'Anomalies',
            recommendations: 'Recommendations',
        },
        image: {
            title: 'Image analysis',
            subtitle: 'JPG, PNG, WebP, GIF (up to 15 MB)',
            uploadPrompt: 'Click or drag an image',
            supported: 'JPG, PNG, WebP, GIF • up to 15 MB',
            analyze: 'Analyze',
            analyzing: 'Analyzing...',
            new: 'New',
            suitable: 'Suitable',
            notRecommended: 'Not recommended',
            size: 'Size',
            file: 'File',
            format: 'Format',
            color: 'Color',
            assessment: 'AI Assessment',
            recommendations: 'Recommendations',
            warnings: 'Warnings',
        },
        audio: {
            title: 'Audio analysis',
            subtitle: 'MP3, WAV, M4A, FLAC, AAC, OGG (up to 100 MB)',
            uploadPrompt: 'Click or drag an audio file',
            supported: 'Transcription, concise summary, and key topics included',
            analyze: 'Transcribe',
            analyzing: 'Processing...',
            new: 'New',
            duration: 'Duration',
            format: 'Format',
            language: 'Language',
            model: 'Model',
            summary: 'Summary',
            topics: 'Key topics',
            transcript: 'Transcript',
            noTranscript: 'Transcript is empty for now.',
            confidence: 'Confidence',
            safetyTitle: 'Malicious content check',
            safe: 'Audio looks safe',
            unsafe: 'Potentially harmful content detected',
            riskScore: 'Risk',
            riskCategories: 'Risk categories',
        },
        history: {
            title: 'AI analysis history',
            empty: 'History is empty',
            emptyHint: 'Start using AI tools',
            exportPdf: 'Export to PDF',
            delete: 'Delete',
            page: 'Page',
            of: 'of',
            untitled: 'Untitled',
            filters: {
                all: 'All tools',
                chat: 'AI Chat',
                validation: 'Content validation',
                document_analysis: 'Document analysis',
                csv_analysis: 'CSV analysis',
                image_analysis: 'Image analysis',
                audio_transcription: 'Audio analysis',
            },
        },
        statistics: {
            empty: 'No data to display',
            total: 'Total analyses',
            week: 'This week',
            month: 'This month',
            favorite: 'Favorite tool',
            usage: 'Usage by tool',
            noUsage: 'No usage data',
            recent: 'Recent activity',
            untitled: 'Untitled',
            times: 'times',
            liveTitle: 'Live Activity',
            liveSubtitle: 'Latest service events and user actions',
            noLive: 'No events yet',
            level: 'Level',
        },
        monitor: {
            title: 'System Monitor',
            subtitle: 'Health checks, RabbitMQ queues, and Redis cache status in one place',
            empty: 'System monitor is not available yet',
            servicesHealthy: 'Healthy services',
            queueBacklog: 'Queue backlog',
            redisState: 'Redis status',
            refreshedAt: 'Refreshed',
            serviceHealth: 'Service health',
            redisCache: 'Redis cache status',
            queues: 'RabbitMQ queues',
            host: 'Host',
            database: 'DB',
            cacheConnected: 'Connection',
            cacheKeys: 'analytics:* keys',
            sampleKeys: 'Sample keys',
            latency: 'Latency',
            httpStatus: 'HTTP',
            messages: 'Messages',
            ready: 'Ready',
            unacked: 'Unacked',
            consumers: 'Consumers',
            state: 'State',
            statuses: {
                healthy: 'Healthy',
                degraded: 'Degraded',
                disabled: 'Disabled',
                missing: 'Missing',
                offline: 'Offline',
            },
        },
        settings: {
            prompts: 'Custom prompts',
            chatPrompt: 'System prompt for chat',
            validationPrompt: 'Validation prompt',
            documentPrompt: 'Document analysis prompt',
            chatPlaceholder: 'Enter system prompt for AI chat...',
            validationPlaceholder: 'Enter prompt for content validation...',
            documentPlaceholder: 'Enter prompt for document analysis...',
            modelSettings: 'AI model settings',
            model: 'Model',
            maxTokens: 'Max tokens',
            temperatureHint: '0 = precise answers, 2 = creative answers',
            interface: 'Interface',
            theme: 'Theme',
            language: 'Language',
            light: 'Light',
            dark: 'Dark',
            fontSize: 'Interface size',
            compact: 'Compact mode',
            compactHint: 'Reduces spacing in header and content',
            save: 'Save settings',
            saving: 'Saving...',
            languages: { ru: 'Russian', en: 'English', kk: 'Kazakh' },
            fontSizes: { sm: 'Compact', md: 'Standard', lg: 'Large' },
        },
        support: {
            center: 'Support center',
            inbox: 'Support Inbox',
            centerSubtitle: 'Report issues and get help',
            inboxSubtitle: 'User requests and admin replies',
            subject: 'Conversation subject',
            createPlaceholder: 'Describe the issue or problem...',
            create: 'Create conversation',
            creating: 'Sending...',
            noUserConversations: 'You have no support conversations yet.',
            noAdminConversations: 'No user conversations yet.',
            choose: 'Select a conversation on the left',
            createFirst: 'Create your first conversation',
            conversationHint: 'Support will reply in this chat.',
            supportReplyHint: 'The user conversation will appear here.',
            selectConversation: 'Select a conversation on the left.',
            noMessages: 'No messages yet',
            replyAdmin: 'Reply to user...',
            replyUser: 'Write a message to support...',
            statuses: { open: 'Open', in_progress: 'In progress', closed: 'Closed' },
            userFallback: 'User',
            adminLabel: 'Administrator',
            userLabel: 'User',
        },
    },
    kk: {
        sidebar: {
            home: 'Басты бет',
            profile: 'Профиль',
            history: 'Тарих',
            settings: 'Баптаулар',
            statistics: 'Статистика',
            admin_control: 'Admin Control',
            system_monitor: 'System Monitor',
            support: 'Қолдау',
            support_admin: 'Support Inbox',
            chat: 'AI Чат',
            validate: 'Контентті тексеру',
            document: 'Құжат талдауы',
            csv: 'CSV талдауы',
            image: 'Сурет талдауы',
            audio: 'Аудио талдауы',
        },
        quickActions: {
            chat: { title: 'AI Чат', desc: 'Ботқа сұрақ қою' },
            validate: { title: 'Мәтінді тексеру', desc: 'AI валидация' },
            document: { title: 'Құжатты тексеру', desc: 'PDF, TXT, DOCX' },
            csv: { title: 'CSV талдауы', desc: 'Деректер сапасын тексеру' },
            image: { title: 'Суретті тексеру', desc: 'AI сапа талдауы' },
            audio: { title: 'Аудионы тексеру', desc: 'Транскрипция және қысқаша мазмұн' },
        },
        topbar: { dashboard: 'Басқару панелі', admin: 'Әкімші', user: 'Пайдаланушы' },
        home: {
            welcome: 'Қош келдіңіз, {name}!',
            subtitle: 'Контентпен жұмыс істеуге арналған бірыңғай орта. Материалдарды жасау, тексеру және талдау үшін AI құралдарын қолданыңыз.',
            quickAccess: 'Жылдам қолжеткізу',
            aiTools: 'AI құралдары',
            status: 'Күйі',
            active: 'Белсенді',
            aiModel: 'AI моделі',
        },
        profile: {
            title: 'Профиль ақпараты',
            fullName: 'Толық аты',
            email: 'Email',
            role: 'Рөл',
            admin: 'Әкімші',
            user: 'Пайдаланушы',
            registeredAt: 'Тіркелген күні',
            username: 'Пайдаланушы аты',
            save: 'Сақтау',
            saving: 'Сақталуда...',
            cancel: 'Бас тарту',
        },
        chat: {
            title: 'AI Көмекшісі',
            online: 'Желіде',
            clear: 'Тазалау',
            placeholder: 'Хабарлама жазыңыз... (жіберу үшін Enter)',
        },
        validate: {
            title: 'Контентті тексеру',
            subtitle: 'Мәтін сапасын AI арқылы талдау',
            heading: 'Тақырып',
            content: 'Мазмұны',
            headingPlaceholder: 'Мақала тақырыбын енгізіңіз',
            contentPlaceholder: 'Мақала мәтінін енгізіңіз',
            submit: 'Тексеру',
            submitting: 'Тексерілуде...',
            score: 'Баға',
            passed: 'Контент тексеруден өтті',
            hasIssues: 'Мәселелер бар',
            reset: 'Жаңа тексеру',
            issues: 'Мәселелер',
            suggestions: 'Ұсыныстар',
        },
        document: {
            title: 'Құжат талдауы',
            subtitle: 'PDF, TXT, DOCX (20 MB дейін)',
            uploadPrompt: 'Файлды басыңыз немесе сүйреп әкеліңіз',
            supported: 'Қолдау көрсетіледі: TXT, PDF, DOCX',
            analyze: 'Талдау',
            analyzing: 'Талдануда...',
            new: 'Жаңа',
            quality: 'Сапа',
            words: 'Сөз',
            type: 'Түрі',
            summary: 'AI Қысқаша мазмұн',
            recommendations: 'Ұсыныстар',
            warnings: 'Ескертулер',
        },
        csv: {
            title: 'CSV талдауы',
            subtitle: 'Деректер мен сапаны тексеру',
            uploadPrompt: 'CSV файлын басыңыз немесе сүйреп әкеліңіз',
            maxSize: 'Максимум 10 MB',
            analyze: 'Талдау',
            analyzing: 'Талдануда...',
            new: 'Жаңа',
            rows: 'Жол',
            columns: 'Баған',
            quality: 'Сапа',
            completeness: 'Толықтық',
            summary: 'AI Қысқаша мазмұн',
            anomalies: 'Аномалиялар',
            recommendations: 'Ұсыныстар',
        },
        image: {
            title: 'Сурет талдауы',
            subtitle: 'JPG, PNG, WebP, GIF (15 MB дейін)',
            uploadPrompt: 'Суретті басыңыз немесе сүйреп әкеліңіз',
            supported: 'JPG, PNG, WebP, GIF • 15 MB дейін',
            analyze: 'Талдау',
            analyzing: 'Талдануда...',
            new: 'Жаңа',
            suitable: 'Сәйкес',
            notRecommended: 'Ұсынылмайды',
            size: 'Өлшемі',
            file: 'Файл',
            format: 'Формат',
            color: 'Түс',
            assessment: 'AI Бағасы',
            recommendations: 'Ұсыныстар',
            warnings: 'Ескертулер',
        },
        audio: {
            title: 'Аудио талдауы',
            subtitle: 'MP3, WAV, M4A, FLAC, AAC, OGG (100 MB дейін)',
            uploadPrompt: 'Аудио файлды басыңыз немесе сүйреп әкеліңіз',
            supported: 'Транскрипция, қысқаша мазмұн және негізгі тақырыптар беріледі',
            analyze: 'Транскрипция жасау',
            analyzing: 'Өңделуде...',
            new: 'Жаңа',
            duration: 'Ұзақтығы',
            format: 'Формат',
            language: 'Тілі',
            model: 'Модель',
            summary: 'Қысқаша мазмұн',
            topics: 'Негізгі тақырыптар',
            transcript: 'Транскрипт',
            noTranscript: 'Транскрипт әлі бос.',
            confidence: 'Сенімділік',
            safetyTitle: 'Зиянды контентті тексеру',
            safe: 'Аудио қауіпсіз көрінеді',
            unsafe: 'Ықтимал қауіпті контент анықталды',
            riskScore: 'Тәуекел',
            riskCategories: 'Тәуекел санаттары',
        },
        history: {
            title: 'AI талдау тарихы',
            empty: 'Тарих бос',
            emptyHint: 'AI құралдарын қолдануды бастаңыз',
            exportPdf: 'PDF-ке экспорттау',
            delete: 'Жою',
            page: 'Бет',
            of: '/',
            untitled: 'Атауы жоқ',
            filters: {
                all: 'Барлық құралдар',
                chat: 'AI Чат',
                validation: 'Контентті тексеру',
                document_analysis: 'Құжат талдауы',
                csv_analysis: 'CSV талдауы',
                image_analysis: 'Сурет талдауы',
                audio_transcription: 'Аудио талдауы',
            },
        },
        statistics: {
            empty: 'Көрсетуге дерек жоқ',
            total: 'Барлық талдау',
            week: 'Апта ішінде',
            month: 'Ай ішінде',
            favorite: 'Ең жиі қолданылатын құрал',
            usage: 'Құралдар бойынша пайдалану',
            noUsage: 'Пайдалану деректері жоқ',
            recent: 'Соңғы белсенділік',
            untitled: 'Атауы жоқ',
            times: 'рет',
            liveTitle: 'Live Activity',
            liveSubtitle: 'Сервистер мен пайдаланушылардың соңғы әрекеттері',
            noLive: 'Оқиғалар әлі жоқ',
            level: 'Деңгей',
        },
        monitor: {
            title: 'System Monitor',
            subtitle: 'Сервистердің күйі, RabbitMQ кезектері және Redis кеші бір жерде',
            empty: 'Мониторинг деректері әзірге қолжетімсіз',
            servicesHealthy: 'Сау сервистер',
            queueBacklog: 'Кезектегі хабарламалар',
            redisState: 'Redis күйі',
            refreshedAt: 'Жаңартылды',
            serviceHealth: 'Сервис health статусы',
            redisCache: 'Redis cache статусы',
            queues: 'RabbitMQ кезектері',
            host: 'Хост',
            database: 'DB',
            cacheConnected: 'Қосылым',
            cacheKeys: 'analytics:* кілттері',
            sampleKeys: 'Кілт мысалдары',
            latency: 'Кідіріс',
            httpStatus: 'HTTP',
            messages: 'Барлығы',
            ready: 'Ready',
            unacked: 'Unacked',
            consumers: 'Consumers',
            state: 'State',
            statuses: {
                healthy: 'Healthy',
                degraded: 'Degraded',
                disabled: 'Disabled',
                missing: 'Missing',
                offline: 'Offline',
            },
        },
        settings: {
            prompts: 'Арнайы промпттар',
            chatPrompt: 'Чатқа арналған жүйелік промпт',
            validationPrompt: 'Валидация промпты',
            documentPrompt: 'Құжат талдау промпты',
            chatPlaceholder: 'AI чат үшін жүйелік промпт енгізіңіз...',
            validationPlaceholder: 'Контентті тексеру промптын енгізіңіз...',
            documentPlaceholder: 'Құжат талдау промптын енгізіңіз...',
            modelSettings: 'AI модель баптаулары',
            model: 'Модель',
            maxTokens: 'Max токендер',
            temperatureHint: '0 = нақты жауаптар, 2 = креативті жауаптар',
            interface: 'Интерфейс',
            theme: 'Тақырып',
            language: 'Тіл',
            light: 'Жарық',
            dark: 'Қараңғы',
            fontSize: 'Интерфейс өлшемі',
            compact: 'Ықшам режим',
            compactHint: 'Тақырып пен контенттегі аралықтарды азайтады',
            save: 'Баптауларды сақтау',
            saving: 'Сақталуда...',
            languages: { ru: 'Орысша', en: 'English', kk: 'Қазақша' },
            fontSizes: { sm: 'Ықшам', md: 'Стандарт', lg: 'Үлкен' },
        },
        support: {
            center: 'Қолдау орталығы',
            inbox: 'Support Inbox',
            centerSubtitle: 'Қателер туралы хабарлау және көмек алу',
            inboxSubtitle: 'Пайдаланушы сұрақтары мен әкімші жауаптары',
            subject: 'Өтініш тақырыбы',
            createPlaceholder: 'Қате немесе мәселені сипаттаңыз...',
            create: 'Өтініш құру',
            creating: 'Жіберілуде...',
            noUserConversations: 'Әзірге өтініштер жоқ.',
            noAdminConversations: 'Пайдаланушылардан өтініш жоқ.',
            choose: 'Сол жақтан өтінішті таңдаңыз',
            createFirst: 'Алғашқы өтінішті құрыңыз',
            conversationHint: 'Қолдау осы чатта жауап береді.',
            supportReplyHint: 'Пайдаланушымен хат алмасу осында көрсетіледі.',
            selectConversation: 'Сол жақтан өтінішті таңдаңыз.',
            noMessages: 'Хабарламалар жоқ',
            replyAdmin: 'Пайдаланушыға жауап беру...',
            replyUser: 'Қолдауға хабарлама жазыңыз...',
            statuses: { open: 'Ашық', in_progress: 'Жұмыста', closed: 'Жабық' },
            userFallback: 'Пайдаланушы',
            adminLabel: 'Әкімші',
            userLabel: 'Пайдаланушы',
        },
    },
};

export const getWorkspaceCopy = (locale: LocaleCode): Copy => copy[locale] || copy.ru;

export const getLocaleTag = (locale: LocaleCode) => {
    const map: Record<LocaleCode, string> = {
        ru: 'ru-RU',
        en: 'en-US',
        kk: 'kk-KZ',
    };
    return map[locale] || 'ru-RU';
};
