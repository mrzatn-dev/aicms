import type { LocaleCode } from './types';

export type PipelineCopy = {
    sidebar: string;
    title: string;
    subtitle: string;
    dropTitle: string;
    dropHint: string;
    selectFile: string;
    start: string;
    starting: string;
    myRuns: string;
    empty: string;
    emptyHint: string;
    processingBanner: string;
    openArticle: string;
    goToArticles: string;
    errorLabel: string;
    summaryLabel: string;
    uploadError: string;
    started: string;
    sourceTypes: Record<string, string>;
    stages: Record<string, string>;
    statuses: Record<string, string>;
};

const copy: Record<LocaleCode, PipelineCopy> = {
    ru: {
        sidebar: 'AI-конвейер',
        title: 'Единый AI-конвейер',
        subtitle: 'Загрузите видео, аудио, изображение или документ — конвейер сам создаст статью: транскрипция, анализ, валидация, AI-анализ и публикация.',
        dropTitle: 'Перетащите файл сюда',
        dropHint: 'Видео (mp4, mov…), аудио (mp3, wav…), изображения (jpg, png…), документы (pdf, docx) и текст (txt, md)',
        selectFile: 'Выбрать файл',
        start: 'Запустить конвейер',
        starting: 'Запуск…',
        myRuns: 'Мои запуски',
        empty: 'Запусков пока нет',
        emptyHint: 'Загрузите первый файл, и конвейер автоматически превратит его в статью.',
        processingBanner: 'Конвейер работает — статусы обновляются автоматически.',
        openArticle: 'Открыть статью',
        goToArticles: 'К статьям',
        errorLabel: 'Ошибка',
        summaryLabel: 'AI-резюме',
        uploadError: 'Не удалось запустить конвейер',
        started: 'Запущено',
        sourceTypes: {
            video: 'Видео',
            audio: 'Аудио',
            image: 'Изображение',
            document: 'Документ',
            text: 'Текст',
        },
        stages: {
            upload: 'Загрузка',
            transcription: 'Транскрипция',
            media_analysis: 'Анализ файла',
            compose: 'Создание статьи',
            validation: 'Валидация',
            ai_analysis: 'AI-анализ',
            publish: 'Публикация',
        },
        statuses: {
            processing: 'В работе',
            completed: 'Завершён',
            failed: 'Ошибка',
        },
    },
    en: {
        sidebar: 'AI pipeline',
        title: 'Unified AI pipeline',
        subtitle: 'Upload a video, audio, image or document — the pipeline turns it into an article: transcription, analysis, validation, AI analysis and publishing.',
        dropTitle: 'Drop a file here',
        dropHint: 'Video (mp4, mov…), audio (mp3, wav…), images (jpg, png…), documents (pdf, docx) and text (txt, md)',
        selectFile: 'Choose file',
        start: 'Start pipeline',
        starting: 'Starting…',
        myRuns: 'My runs',
        empty: 'No runs yet',
        emptyHint: 'Upload your first file and the pipeline will turn it into an article automatically.',
        processingBanner: 'Pipeline is running — statuses refresh automatically.',
        openArticle: 'Open article',
        goToArticles: 'Go to articles',
        errorLabel: 'Error',
        summaryLabel: 'AI summary',
        uploadError: 'Could not start the pipeline',
        started: 'Started',
        sourceTypes: {
            video: 'Video',
            audio: 'Audio',
            image: 'Image',
            document: 'Document',
            text: 'Text',
        },
        stages: {
            upload: 'Upload',
            transcription: 'Transcription',
            media_analysis: 'File analysis',
            compose: 'Article draft',
            validation: 'Validation',
            ai_analysis: 'AI analysis',
            publish: 'Publishing',
        },
        statuses: {
            processing: 'Processing',
            completed: 'Completed',
            failed: 'Failed',
        },
    },
    kk: {
        sidebar: 'AI конвейер',
        title: 'Бірыңғай AI конвейері',
        subtitle: 'Бейне, аудио, сурет немесе құжатты жүктеңіз — конвейер оны мақалаға айналдырады: транскрипция, талдау, валидация, AI талдау және жариялау.',
        dropTitle: 'Файлды осында тастаңыз',
        dropHint: 'Бейне (mp4, mov…), аудио (mp3, wav…), суреттер (jpg, png…), құжаттар (pdf, docx) және мәтін (txt, md)',
        selectFile: 'Файл таңдау',
        start: 'Конвейерді іске қосу',
        starting: 'Іске қосылуда…',
        myRuns: 'Менің іске қосуларым',
        empty: 'Әзірге іске қосулар жоқ',
        emptyHint: 'Алғашқы файлды жүктеңіз — конвейер оны автоматты түрде мақалаға айналдырады.',
        processingBanner: 'Конвейер жұмыс істеп тұр — статустар автоматты жаңарады.',
        openArticle: 'Мақаланы ашу',
        goToArticles: 'Мақалаларға өту',
        errorLabel: 'Қате',
        summaryLabel: 'AI қорытынды',
        uploadError: 'Конвейерді іске қосу сәтсіз аяқталды',
        started: 'Іске қосылды',
        sourceTypes: {
            video: 'Бейне',
            audio: 'Аудио',
            image: 'Сурет',
            document: 'Құжат',
            text: 'Мәтін',
        },
        stages: {
            upload: 'Жүктеу',
            transcription: 'Транскрипция',
            media_analysis: 'Файл талдауы',
            compose: 'Мақала жасау',
            validation: 'Валидация',
            ai_analysis: 'AI талдау',
            publish: 'Жариялау',
        },
        statuses: {
            processing: 'Өңделуде',
            completed: 'Аяқталды',
            failed: 'Қате',
        },
    },
};

export function getPipelineCopy(locale: LocaleCode): PipelineCopy {
    return copy[locale] ?? copy.ru;
}
