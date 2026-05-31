import type { LocaleCode } from './types';

export type ArticlesCopy = {
    sidebar: string;
    title: string;
    subtitle: string;
    newArticle: string;
    myArticles: string;
    publicBlog: string;
    searchPlaceholder: string;
    empty: string;
    emptyHint: string;
    loading: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    viewPublic: string;
    submitReview: string;
    approve: string;
    reject: string;
    publish: string;
    titleLabel: string;
    contentLabel: string;
    categoryLabel: string;
    tagsLabel: string;
    tagsHint: string;
    noCategory: string;
    created: string;
    updated: string;
    deleteConfirm: string;
    saveAsArticle: string;
    saveSuccess: string;
    saveError: string;
    preview: string;
    editMode: string;
    coverImage: string;
    uploadCover: string;
    uploadingCover: string;
    status: Record<string, string>;
};

const copy: Record<LocaleCode, ArticlesCopy> = {
    ru: {
        sidebar: 'Статьи',
        title: 'Управление статьями',
        subtitle: 'Создавайте материалы, отправляйте на проверку и публикуйте в блоге.',
        newArticle: 'Новая статья',
        myArticles: 'Мои статьи',
        publicBlog: 'Публичный блог',
        searchPlaceholder: 'Поиск по заголовку…',
        empty: 'Статей пока нет',
        emptyHint: 'Создайте первую статью или сохраните результат из AI-инструментов.',
        loading: 'Загрузка…',
        save: 'Сохранить',
        saving: 'Сохранение…',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        viewPublic: 'Открыть на сайте',
        submitReview: 'На модерацию',
        approve: 'Одобрить',
        reject: 'Отклонить',
        publish: 'Опубликовать',
        titleLabel: 'Заголовок',
        contentLabel: 'Текст',
        categoryLabel: 'Категория',
        tagsLabel: 'Теги',
        tagsHint: 'через запятую',
        noCategory: 'Без категории',
        created: 'Создано',
        updated: 'Обновлено',
        deleteConfirm: 'Удалить эту статью?',
        saveAsArticle: 'Сохранить как статью',
        saveSuccess: 'Статья сохранена',
        saveError: 'Не удалось сохранить статью',
        preview: 'Превью',
        editMode: 'Редактор',
        coverImage: 'Обложка',
        uploadCover: 'Загрузить обложку',
        uploadingCover: 'Загрузка…',
        status: {
            draft: 'Черновик',
            pending: 'На модерации',
            validating: 'Проверка',
            analyzing: 'AI-анализ',
            published: 'Опубликовано',
            rejected: 'Отклонено',
        },
    },
    en: {
        sidebar: 'Articles',
        title: 'Article management',
        subtitle: 'Create content, submit for review, and publish to the blog.',
        newArticle: 'New article',
        myArticles: 'My articles',
        publicBlog: 'Public blog',
        searchPlaceholder: 'Search by title…',
        empty: 'No articles yet',
        emptyHint: 'Create your first article or save output from AI tools.',
        loading: 'Loading…',
        save: 'Save',
        saving: 'Saving…',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        viewPublic: 'View on site',
        submitReview: 'Submit for review',
        approve: 'Approve',
        reject: 'Reject',
        publish: 'Publish',
        titleLabel: 'Title',
        contentLabel: 'Body',
        categoryLabel: 'Category',
        tagsLabel: 'Tags',
        tagsHint: 'comma-separated',
        noCategory: 'No category',
        created: 'Created',
        updated: 'Updated',
        deleteConfirm: 'Delete this article?',
        saveAsArticle: 'Save as article',
        saveSuccess: 'Article saved',
        saveError: 'Could not save article',
        preview: 'Preview',
        editMode: 'Editor',
        coverImage: 'Cover image',
        uploadCover: 'Upload cover',
        uploadingCover: 'Uploading…',
        status: {
            draft: 'Draft',
            pending: 'Pending review',
            validating: 'Validating',
            analyzing: 'AI analysis',
            published: 'Published',
            rejected: 'Rejected',
        },
    },
    kk: {
        sidebar: 'Мақалалар',
        title: 'Мақалаларды басқару',
        subtitle: 'Материал жасаңыз, тексеруге жіберіңіз және блогта жариялаңыз.',
        newArticle: 'Жаңа мақала',
        myArticles: 'Менің мақалаларым',
        publicBlog: 'Жария блог',
        searchPlaceholder: 'Тақырып бойынша іздеу…',
        empty: 'Мақалалар әлі жоқ',
        emptyHint: 'Бірінші мақаланы жасаңыз немесе AI құралдарынан сақтаңыз.',
        loading: 'Жүктелуде…',
        save: 'Сақтау',
        saving: 'Сақталуда…',
        cancel: 'Болдырмау',
        delete: 'Жою',
        edit: 'Өңдеу',
        viewPublic: 'Сайтта ашу',
        submitReview: 'Модерацияға',
        approve: 'Мақұлдау',
        reject: 'Қабылдамау',
        publish: 'Жариялау',
        titleLabel: 'Тақырып',
        contentLabel: 'Мәтін',
        categoryLabel: 'Санат',
        tagsLabel: 'Тегтер',
        tagsHint: 'үтірмен',
        noCategory: 'Санатсыз',
        created: 'Жасалған',
        updated: 'Жаңартылған',
        deleteConfirm: 'Бұл мақаланы жою керек пе?',
        saveAsArticle: 'Мақала ретінде сақтау',
        saveSuccess: 'Мақала сақталды',
        saveError: 'Мақаланы сақтау сәтсіз',
        preview: 'Алдын ала қарау',
        editMode: 'Редактор',
        coverImage: 'Мұқаба',
        uploadCover: 'Мұқабаны жүктеу',
        uploadingCover: 'Жүктелуде…',
        status: {
            draft: 'Жоба',
            pending: 'Модерацияда',
            validating: 'Тексеру',
            analyzing: 'AI талдау',
            published: 'Жарияланған',
            rejected: 'Қабылданбаған',
        },
    },
};

export function getArticlesCopy(locale: LocaleCode): ArticlesCopy {
    return copy[locale] ?? copy.ru;
}

export function statusLabel(locale: LocaleCode, status: string): string {
    const c = getArticlesCopy(locale);
    return c.status[status] ?? status;
}
