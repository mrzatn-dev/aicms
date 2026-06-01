import type { LocaleCode } from '@/app/i18n';

type PricingCopy = {
    title: string;
    subtitle: string;
    perMonth: string;
    forever: string;
    popular: string;
    startFree: string;
    choosePlan: string;
};

export const getPricingCopy = (locale: LocaleCode): PricingCopy => {
    const copies: Record<LocaleCode, PricingCopy> = {
        ru: {
            title: 'Тарифы в тенге',
            subtitle:
                'Прозрачная подписка для редакций и команд: оплата в казахстанских тенге (₸), лимиты AI-запросов и транскрипции по тарифу.',
            perMonth: 'в месяц',
            forever: 'бесплатно',
            popular: 'Популярный',
            startFree: 'Начать бесплатно',
            choosePlan: 'Выбрать тариф',
        },
        en: {
            title: 'Plans in Tenge',
            subtitle:
                'Simple subscription for content teams: prices in Kazakhstani Tenge (₸), AI and transcription limits per plan.',
            perMonth: 'per month',
            forever: 'free',
            popular: 'Popular',
            startFree: 'Start free',
            choosePlan: 'Choose plan',
        },
        kk: {
            title: 'Теңгемен тарифтер',
            subtitle:
                'Редакциялар мен командаларға: баға теңгемен (₸), тариф бойынша AI және транскрипция лимиттері.',
            perMonth: 'айына',
            forever: 'тегін',
            popular: 'Танымал',
            startFree: 'Тегін бастау',
            choosePlan: 'Тарифті таңдау',
        },
    };
    return copies[locale] || copies.ru;
};
