import type { LocaleCode } from './types';

type SubscriptionCopy = {
    sidebar: string;
    title: string;
    subtitle: string;
    currentPlan: string;
    period: string;
    usageTitle: string;
    aiRequests: string;
    audioMinutes: string;
    usedOf: string;
    choosePlan: string;
    perMonth: string;
    forever: string;
    activate: string;
    current: string;
    activating: string;
    demoNote: string;
    success: string;
    error: string;
    goToWorkspace: string;
    currency: string;
};

export const getSubscriptionCopy = (locale: LocaleCode): SubscriptionCopy => {
    const copies: Record<LocaleCode, SubscriptionCopy> = {
        ru: {
            sidebar: 'Подписка',
            title: 'Тарифы и подписка',
            subtitle: 'Все цены в казахстанских тенге (₸). Оплата по подписке — ежемесячно.',
            currentPlan: 'Текущий тариф',
            period: 'Период',
            usageTitle: 'Использование за период',
            aiRequests: 'AI-запросы',
            audioMinutes: 'Транскрипция (мин)',
            usedOf: 'из',
            choosePlan: 'Выберите тариф',
            perMonth: 'в месяц',
            forever: 'бесплатно',
            activate: 'Подключить',
            current: 'Текущий',
            activating: 'Подключение…',
            demoNote:
                'Демо-режим: списание с карты/Kaspi не выполняется. Для диплома показана модель монетизации.',
            success: 'Тариф успешно изменён',
            error: 'Не удалось изменить тариф',
            goToWorkspace: 'Перейти в кабинет',
            currency: '₸',
        },
        en: {
            sidebar: 'Subscription',
            title: 'Plans & billing',
            subtitle: 'All prices in Kazakhstani Tenge (₸). Billed monthly.',
            currentPlan: 'Current plan',
            period: 'Period',
            usageTitle: 'Usage this period',
            aiRequests: 'AI requests',
            audioMinutes: 'Transcription (min)',
            usedOf: 'of',
            choosePlan: 'Choose a plan',
            perMonth: 'per month',
            forever: 'free',
            activate: 'Subscribe',
            current: 'Current',
            activating: 'Activating…',
            demoNote: 'Demo mode: no real Kaspi/card charge. Shows monetization model for the thesis.',
            success: 'Plan updated successfully',
            error: 'Could not change plan',
            goToWorkspace: 'Open workspace',
            currency: '₸',
        },
        kk: {
            sidebar: 'Жазылым',
            title: 'Тарифтер және жазылым',
            subtitle: 'Барлық бағалар теңгемен (₸). Ай сайын төлем.',
            currentPlan: 'Ағымдағы тариф',
            period: 'Кезең',
            usageTitle: 'Пайдалану',
            aiRequests: 'AI сұраулар',
            audioMinutes: 'Транскрипция (мин)',
            usedOf: 'ішінен',
            choosePlan: 'Тарифті таңдаңыз',
            perMonth: 'айына',
            forever: 'тегін',
            activate: 'Қосу',
            current: 'Ағымдағы',
            activating: 'Қосылуда…',
            demoNote: 'Демо: нақты төлем жоқ. Диплом үшін монетизация моделі.',
            success: 'Тариф өзгертілді',
            error: 'Тарифті өзгерту сәтсіз',
            goToWorkspace: 'Жұмыс кеңістігіне',
            currency: '₸',
        },
    };
    return copies[locale] || copies.ru;
};
