'use client';

import './workspace.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { contentApi, padArticleContent } from '@/lib/content';
import { exportToPDF } from '@/lib/pdfExport';

import { getArticlesCopy } from './articles-i18n';

import { fontSizeMap, getInitialChatMessages } from './config';
import { getWorkspaceCopy } from './i18n';
import { ToastHost, showToast } from './components/ToastHost';
import { buildArticleFromHistory } from './utils/articleFromHistory';
import {
    buildArticleFromAudioResult,
    buildArticleFromCsvResult,
    buildArticleFromImageResult,
} from './utils/articleFromAi';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { WorkspaceTopBar } from './components/WorkspaceTopBar';
import { ArticlesTab } from './components/tabs/ArticlesTab';
import { AudioTab } from './components/tabs/AudioTab';
import { PipelineTab } from './components/tabs/PipelineTab';
import { AdminControlTab } from './components/tabs/AdminControlTab';
import { ChatTab } from './components/tabs/ChatTab';
import { CsvTab } from './components/tabs/CsvTab';
import { DocumentTab } from './components/tabs/DocumentTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { HomeTab } from './components/tabs/HomeTab';
import { ImageTab } from './components/tabs/ImageTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { SubscriptionTab } from './components/tabs/SubscriptionTab';
import type { SubscriptionData, SubscriptionPlan } from './components/tabs/SubscriptionTab';
import { StatisticsTab } from './components/tabs/StatisticsTab';
import { getSubscriptionCopy } from './subscription-i18n';
import { SupportCenterTab } from './components/tabs/SupportCenterTab';
import { SystemMonitorTab } from './components/tabs/SystemMonitorTab';
import { ValidateTab } from './components/tabs/ValidateTab';
import type {
    ActiveTab,
    AdminFileItem,
    AdminOverviewData,
    AdminUserItem,
    AudioResult,
    ChatMessage,
    CSVResult,
    DocumentResult,
    HistoryItem,
    ImageResult,
    AnalyticsLogItem,
    SettingsFormState,
    StatisticsData,
    SystemMonitorData,
    SupportConversation,
    SupportConversationListItem,
    UserInfo,
    ValidationResult,
} from './types';

const initialSettingsForm: SettingsFormState = {
    chat_system_prompt: '',
    validation_prompt: '',
    document_analysis_prompt: '',
    preferred_model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 2000,
    theme: 'light',
    language: 'ru',
    email_notifications: true,
    custom_settings: {
        ui_font_size: 'md',
        compact_mode: false,
    },
};

export default function UnifiedDashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState<UserInfo | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('home');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [avatarPreset, setAvatarPreset] = useState('aurora');
    const [avatarEmoji, setAvatarEmoji] = useState('');

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(getInitialChatMessages('ru'));
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [validateTitle, setValidateTitle] = useState('');
    const [validateContent, setValidateContent] = useState('');
    const [validateLoading, setValidateLoading] = useState(false);
    const [validateResult, setValidateResult] = useState<ValidationResult | null>(null);

    const [docFile, setDocFile] = useState<File | null>(null);
    const [docLoading, setDocLoading] = useState(false);
    const [docResult, setDocResult] = useState<DocumentResult | null>(null);
    const [docError, setDocError] = useState<string | null>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvLoading, setCsvLoading] = useState(false);
    const [csvResult, setCsvResult] = useState<CSVResult | null>(null);
    const [csvError, setCsvError] = useState<string | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const [imgFile, setImgFile] = useState<File | null>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);
    const [imgLoading, setImgLoading] = useState(false);
    const [imgResult, setImgResult] = useState<ImageResult | null>(null);
    const [imgError, setImgError] = useState<string | null>(null);
    const imgInputRef = useRef<HTMLInputElement>(null);

    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyFilter, setHistoryFilter] = useState('all');

    const [articleSaveLoading, setArticleSaveLoading] = useState(false);
    const [articlesRefresh, setArticlesRefresh] = useState(0);

    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>(initialSettingsForm);
    const [savingSettings, setSavingSettings] = useState(false);

    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [subscriptionPaymentNote, setSubscriptionPaymentNote] = useState('');
    const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

    const [statistics, setStatistics] = useState<StatisticsData | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityItems, setActivityItems] = useState<AnalyticsLogItem[]>([]);
    const [monitorLoading, setMonitorLoading] = useState(false);
    const [systemMonitor, setSystemMonitor] = useState<SystemMonitorData | null>(null);

    const [adminLoading, setAdminLoading] = useState(false);
    const [adminUsersLoading, setAdminUsersLoading] = useState(false);
    const [adminFilesLoading, setAdminFilesLoading] = useState(false);
    const [adminOverview, setAdminOverview] = useState<AdminOverviewData | null>(null);
    const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
    const [adminUsersTotal, setAdminUsersTotal] = useState(0);
    const [adminFiles, setAdminFiles] = useState<AdminFileItem[]>([]);
    const [adminFilesTotal, setAdminFilesTotal] = useState(0);
    const [adminUserSearch, setAdminUserSearch] = useState('');
    const [adminFileSearch, setAdminFileSearch] = useState('');
    const [adminUserRoleFilter, setAdminUserRoleFilter] = useState('all');
    const [adminFileToolFilter, setAdminFileToolFilter] = useState('all');

    const [supportLoading, setSupportLoading] = useState(false);
    const [supportItems, setSupportItems] = useState<SupportConversationListItem[]>([]);
    const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
    const [selectedSupportConversation, setSelectedSupportConversation] = useState<SupportConversation | null>(null);
    const [supportDraftMessage, setSupportDraftMessage] = useState('');
    const [newSupportSubject, setNewSupportSubject] = useState('');
    const [newSupportMessage, setNewSupportMessage] = useState('');
    const [supportSending, setSupportSending] = useState(false);
    const [supportStatusUpdating, setSupportStatusUpdating] = useState(false);
    const [supportUnreadCount, setSupportUnreadCount] = useState(0);
    const [supportAdminUnreadCount, setSupportAdminUnreadCount] = useState(0);
    const locale = settingsForm.language === 'en' || settingsForm.language === 'kk' ? settingsForm.language : 'ru';
    const copy = getWorkspaceCopy(locale);
    const getAvatarStorageKey = (userId: string) => `avatar_prefs_${userId}`;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const hasSession = await api.ensureSession();
            if (cancelled) return;
            if (!hasSession) {
                router.push('/login');
                return;
            }

            const storedUser = localStorage.getItem('user');
            let parsedUser: UserInfo | null = null;

            if (storedUser) {
                try {
                    parsedUser = JSON.parse(storedUser) as UserInfo;
                } catch {
                    parsedUser = null;
                }
            }

            if (!parsedUser) {
                try {
                    parsedUser = await api.getProfile();
                    localStorage.setItem('user', JSON.stringify(parsedUser));
                } catch {
                    router.push('/login');
                    return;
                }
            }

            if (!parsedUser || cancelled) {
                if (!parsedUser) router.push('/login');
                return;
            }

            setUser(parsedUser);
            setProfileForm({
                full_name: parsedUser.full_name || '',
                email: parsedUser.email || '',
            });

            const savedAvatar = localStorage.getItem(getAvatarStorageKey(parsedUser.id));
            if (savedAvatar) {
                try {
                    const parsedAvatar = JSON.parse(savedAvatar) as { preset?: string; emoji?: string };
                    if (parsedAvatar.preset) setAvatarPreset(parsedAvatar.preset);
                    if (typeof parsedAvatar.emoji === 'string') setAvatarEmoji(parsedAvatar.emoji);
                } catch {
                    // Ignore invalid avatar JSON
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router]);

    useEffect(() => {
        if (!user) return;
        localStorage.setItem(
            getAvatarStorageKey(user.id),
            JSON.stringify({ preset: avatarPreset, emoji: avatarEmoji }),
        );
    }, [user, avatarPreset, avatarEmoji]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    useEffect(() => {
        if (activeTab === 'history') {
            void loadHistory();
        }
    }, [activeTab, historyPage, historyFilter]);

    useEffect(() => {
        if (user) {
            void loadSettings();
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'statistics') {
            void loadStatistics();
            if (user?.role === 'admin') {
                void loadAnalyticsLogs();
            }
        }
    }, [activeTab, user?.role]);

    useEffect(() => {
        if (activeTab === 'system_monitor' && user?.role === 'admin') {
            void loadSystemMonitor();
        }
    }, [activeTab, user?.role]);

    useEffect(() => {
        if (activeTab === 'admin_control' && user?.role === 'admin') {
            void loadAdminControl();
        }
    }, [activeTab, user?.role, adminUserSearch, adminFileSearch, adminUserRoleFilter, adminFileToolFilter]);

    useEffect(() => {
        if (activeTab === 'subscription' && user) {
            void loadSubscription();
        }
    }, [activeTab, user, locale]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.classList.toggle('dark', settingsForm.theme === 'dark');
    }, [settingsForm.theme]);

    useEffect(() => {
        api.setInterfaceLanguage(locale);
    }, [locale]);

    const calculateUnreadTotal = (items: SupportConversationListItem[]) => (
        items.reduce((sum, item) => sum + (item.unread_count || 0), 0)
    );

    const syncSupportListReadState = (conversationId: string, adminMode: boolean) => {
        setSupportItems((prev) => {
            const next = prev.map((item) => (
                item.id === conversationId
                    ? { ...item, unread_count: 0 }
                    : item
            ));
            const unreadTotal = calculateUnreadTotal(next);
            if (adminMode) {
                setSupportAdminUnreadCount(unreadTotal);
            } else {
                setSupportUnreadCount(unreadTotal);
            }
            return next;
        });
    };

    const handleLogout = () => {
        api.logout();
        router.push('/');
    };

    const handleProfileSave = async () => {
        if (!user) return;

        setSavingProfile(true);
        try {
            const updated = await api.updateProfile(user.id, profileForm);
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
            setEditingProfile(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setSavingProfile(false);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const filter = historyFilter === 'all' ? undefined : historyFilter;
            const response = await api.getHistory(historyPage, 20, filter);
            setHistoryItems(response.items || []);
            setHistoryTotal(response.total || 0);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadSubscription = async () => {
        setSubscriptionLoading(true);
        try {
            const [plansRes, subRes] = await Promise.all([
                api.getSubscriptionPlans(locale),
                api.getMySubscription(locale),
            ]);
            setSubscriptionPlans(plansRes.plans || []);
            setSubscriptionPaymentNote(plansRes.payment_note || '');
            setSubscription({
                plan_id: subRes.plan_id,
                plan_name: subRes.plan_name,
                price_label: subRes.price_label,
                billing_period: subRes.billing_period,
                current_period_start: subRes.current_period_start,
                current_period_end: subRes.current_period_end,
                usage: subRes.usage,
            });
        } catch (error) {
            console.error('Failed to load subscription:', error);
        } finally {
            setSubscriptionLoading(false);
        }
    };

    const handleChangePlan = async (planId: string) => {
        const subCopy = getSubscriptionCopy(locale);
        setChangingPlanId(planId);
        try {
            const result = await api.changeSubscription(planId, locale);
            await loadSubscription();
            showToast(result.message || subCopy.success, 'success');
        } catch {
            showToast(subCopy.error, 'error');
        } finally {
            setChangingPlanId(null);
        }
    };

    const loadSettings = async () => {
        setSettingsLoading(true);
        try {
            const response = await api.getSettings();
            setSettingsForm({
                chat_system_prompt: response.chat_system_prompt || '',
                validation_prompt: response.validation_prompt || '',
                document_analysis_prompt: response.document_analysis_prompt || '',
                preferred_model: response.preferred_model || 'deepseek-chat',
                temperature: response.temperature || 0.7,
                max_tokens: response.max_tokens || 2000,
                theme: response.theme || 'light',
                language: response.language || 'ru',
                email_notifications: response.email_notifications ?? true,
                custom_settings: {
                    ui_font_size: response.custom_settings?.ui_font_size || 'md',
                    compact_mode: response.custom_settings?.compact_mode ?? false,
                },
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    };

    const loadStatistics = async () => {
        setStatsLoading(true);
        try {
            const response = await api.getStatistics();
            setStatistics(response);
        } catch (error) {
            console.error('Failed to load statistics:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const loadAnalyticsLogs = async () => {
        if (user?.role !== 'admin') return;
        setActivityLoading(true);
        try {
            const response = await api.getAnalyticsLogs(12);
            setActivityItems(response || []);
        } catch (error) {
            console.error('Failed to load analytics logs:', error);
        } finally {
            setActivityLoading(false);
        }
    };

    const loadSystemMonitor = async () => {
        if (user?.role !== 'admin') return;
        setMonitorLoading(true);
        try {
            const response = await api.getSystemMonitor();
            setSystemMonitor(response);
        } catch (error) {
            console.error('Failed to load system monitor:', error);
        } finally {
            setMonitorLoading(false);
        }
    };

    const loadAdminControl = async () => {
        if (user?.role !== 'admin') return;
        setAdminLoading(true);
        await Promise.all([
            loadAdminOverview(),
            loadAdminUsers(),
            loadAdminFiles(),
        ]);
        setAdminLoading(false);
    };

    const loadAdminOverview = async () => {
        if (user?.role !== 'admin') return;
        try {
            const response = await api.getAdminOverview();
            setAdminOverview(response);
        } catch (error) {
            console.error('Failed to load admin overview:', error);
        }
    };

    const loadAdminUsers = async () => {
        if (user?.role !== 'admin') return;
        setAdminUsersLoading(true);
        try {
            const response = await api.getAdminUsers(1, 30, adminUserSearch, adminUserRoleFilter);
            setAdminUsers(response.items || []);
            setAdminUsersTotal(response.total || 0);
        } catch (error) {
            console.error('Failed to load admin users:', error);
        } finally {
            setAdminUsersLoading(false);
        }
    };

    const loadAdminFiles = async () => {
        if (user?.role !== 'admin') return;
        setAdminFilesLoading(true);
        try {
            const response = await api.getAdminFiles(1, 30, adminFileToolFilter, adminFileSearch);
            setAdminFiles(response.items || []);
            setAdminFilesTotal(response.total || 0);
        } catch (error) {
            console.error('Failed to load admin files:', error);
        } finally {
            setAdminFilesLoading(false);
        }
    };

    const handleAdminUpdateUser = async (userId: string, data: { role?: string; is_active?: boolean }) => {
        try {
            await api.updateUser(userId, data);
            await loadAdminControl();
        } catch (error) {
            console.error('Failed to update admin user:', error);
        }
    };

    const handleAdminDeleteUser = async (userId: string) => {
        if (!window.confirm('Удалить пользователя и все связанные данные?')) return;

        try {
            await api.deleteUser(userId);
            await loadAdminControl();
        } catch (error) {
            console.error('Failed to delete admin user:', error);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.updateSettings({
                chat_system_prompt: settingsForm.chat_system_prompt,
                validation_prompt: settingsForm.validation_prompt,
                document_analysis_prompt: settingsForm.document_analysis_prompt,
                preferred_model: settingsForm.preferred_model,
                temperature: settingsForm.temperature,
                max_tokens: settingsForm.max_tokens,
                theme: settingsForm.theme,
                language: settingsForm.language,
                email_notifications: settingsForm.email_notifications,
                custom_settings: settingsForm.custom_settings,
            });
            await loadSettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSavingSettings(false);
        }
    };

    const loadSupportConversations = async (
        adminMode: boolean,
        options?: { showLoading?: boolean; syncUi?: boolean },
    ) => {
        const showLoading = options?.showLoading ?? true;
        const syncUi = options?.syncUi ?? true;
        const isCurrentMode = adminMode ? activeTab === 'support_admin' : activeTab === 'support';

        if (showLoading && syncUi && isCurrentMode) {
            setSupportLoading(true);
        }
        try {
            const response = adminMode
                ? await api.getAdminSupportConversations()
                : await api.getSupportConversations();
            const items = response.items || [];
            const unreadTotal = calculateUnreadTotal(items);

            if (adminMode) {
                setSupportAdminUnreadCount(unreadTotal);
            } else {
                setSupportUnreadCount(unreadTotal);
            }

            if (!syncUi || !isCurrentMode) {
                return;
            }

            setSupportItems(items);

            const currentId = selectedSupportId && items.some((item: SupportConversationListItem) => item.id === selectedSupportId)
                ? selectedSupportId
                : items[0]?.id || null;
            setSelectedSupportId(currentId);

            if (currentId) {
                await loadSupportConversation(currentId, adminMode);
            } else {
                setSelectedSupportConversation(null);
            }
        } catch (error) {
            console.error('Failed to load support conversations:', error);
        } finally {
            if (showLoading && syncUi && isCurrentMode) {
                setSupportLoading(false);
            }
        }
    };

    const loadSupportConversation = async (conversationId: string, adminMode: boolean) => {
        try {
            const response = adminMode
                ? await api.getAdminSupportConversation(conversationId)
                : await api.getSupportConversation(conversationId);
            setSelectedSupportConversation(response);
            setSelectedSupportId(response.id);
            syncSupportListReadState(response.id, adminMode);
        } catch (error) {
            console.error('Failed to load support conversation:', error);
        }
    };

    const handleCreateSupportConversation = async () => {
        if (!newSupportSubject.trim() || !newSupportMessage.trim()) return;

        setSupportSending(true);
        try {
            const created = await api.createSupportConversation({
                subject: newSupportSubject,
                message: newSupportMessage,
            });
            setNewSupportSubject('');
            setNewSupportMessage('');
            setSelectedSupportConversation(created);
            setSelectedSupportId(created.id);
            await loadSupportConversations(false);
        } catch (error) {
            console.error('Failed to create support conversation:', error);
        } finally {
            setSupportSending(false);
        }
    };

    const handleSendSupportMessage = async (adminMode: boolean) => {
        if (!selectedSupportId || !supportDraftMessage.trim()) return;

        setSupportSending(true);
        try {
            const updated = adminMode
                ? await api.sendAdminSupportMessage(selectedSupportId, { message: supportDraftMessage })
                : await api.sendSupportMessage(selectedSupportId, { message: supportDraftMessage });
            setSupportDraftMessage('');
            setSelectedSupportConversation(updated);
            await loadSupportConversations(adminMode);
        } catch (error) {
            console.error('Failed to send support message:', error);
        } finally {
            setSupportSending(false);
        }
    };

    const handleChangeSupportStatus = async (status: 'open' | 'in_progress' | 'closed') => {
        if (!selectedSupportId) return;

        setSupportStatusUpdating(true);
        try {
            const updated = await api.updateAdminSupportStatus(selectedSupportId, { status });
            setSelectedSupportConversation(updated);
            await loadSupportConversations(true);
        } catch (error) {
            console.error('Failed to update support status:', error);
        } finally {
            setSupportStatusUpdating(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        try {
            await api.deleteHistoryItem(id);
            await loadHistory();
        } catch (error) {
            console.error('Failed to delete history:', error);
        }
    };

    const persistHistory = async (payload: {
        tool_type: string;
        input_data?: any;
        result_data?: any;
        filename?: string;
        title?: string;
    }) => {
        try {
            await api.createHistory(payload);
        } catch (error) {
            console.warn('Failed to save history item:', error);
        }
    };

    const handleExportPDF = (item: HistoryItem) => {
        exportToPDF({
            title: item.title || `AI Analysis - ${item.tool_type}`,
            toolType: item.tool_type,
            date: new Date(item.created_at).toLocaleString('ru-RU'),
            filename: item.filename || undefined,
            inputData: item.input_data || undefined,
            resultData: item.result_data || undefined,
        });
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: chatInput.trim(),
            timestamp: new Date(),
        };

        const history = chatMessages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        setChatMessages((prev) => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);

        try {
            let fullReply = '';
            fullReply = await api.chatAIStream(userMessage.content, history, locale, (delta) => {
                setChatMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = { ...last, content: last.content + delta };
                    }
                    return updated;
                });
            });
            await persistHistory({
                tool_type: 'chat',
                input_data: { message: userMessage.content },
                result_data: { reply: fullReply },
                title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
            });
        } catch (error: any) {
            setChatMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant' && !last.content) {
                    updated[updated.length - 1] = {
                        ...last,
                        content: `Ошибка: ${error.message || 'Не удалось получить ответ'}`,
                    };
                    return updated;
                }
                return [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `Ошибка: ${error.message || 'Не удалось получить ответ'}`,
                        timestamp: new Date(),
                    },
                ];
            });
        } finally {
            setChatLoading(false);
        }
    };

    const handleValidate = async () => {
        if (!validateTitle.trim() || !validateContent.trim()) return;

        setValidateLoading(true);
        try {
            const response = await api.validateContent({ title: validateTitle, content: validateContent, language: locale });
            setValidateResult(response);
            await persistHistory({
                tool_type: 'validation',
                input_data: { title: validateTitle, content: validateContent.slice(0, 500) },
                result_data: response,
                title: validateTitle,
            });
        } catch (error: any) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setValidateLoading(false);
        }
    };

    const handleSaveAsArticle = async (title: string, content: string) => {
        setArticleSaveLoading(true);
        const articlesCopy = getArticlesCopy(locale);
        try {
            await contentApi.create({
                title: title.slice(0, 500),
                content: padArticleContent(content),
            });
            setArticlesRefresh((n) => n + 1);
            setActiveTab('articles');
            showToast(articlesCopy.saveSuccess, 'success');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : articlesCopy.saveError;
            showToast(message, 'error');
        } finally {
            setArticleSaveLoading(false);
        }
    };

    const handleSaveHistoryAsArticle = async (item: HistoryItem) => {
        const payload = buildArticleFromHistory(item);
        if (!payload) {
            showToast(getArticlesCopy(locale).saveError, 'error');
            return;
        }
        await handleSaveAsArticle(payload.title, payload.content);
    };

    const handleDocFile = useCallback((file: File) => {
        const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!['.txt', '.pdf', '.docx'].includes(extension)) {
            setDocError('Разрешены только: TXT, PDF, DOCX');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setDocError('Файл слишком большой. Максимум 20 MB');
            return;
        }

        setDocFile(file);
        setDocError(null);
        setDocResult(null);
    }, []);

    const handleDocAnalyze = async () => {
        if (!docFile) return;

        setDocLoading(true);
        setDocError(null);
        try {
            const data = await api.uploadDocument(docFile);
            setDocResult(data);
            await persistHistory({
                tool_type: 'document_analysis',
                input_data: { filename: docFile.name, size: docFile.size },
                result_data: data,
                filename: docFile.name,
                title: `Анализ: ${docFile.name}`,
            });
        } catch (error: any) {
            setDocError(error.message || 'Ошибка при анализе документа');
        } finally {
            setDocLoading(false);
        }
    };

    const resetDoc = () => {
        setDocFile(null);
        setDocResult(null);
        setDocError(null);
        if (docInputRef.current) docInputRef.current.value = '';
    };

    const handleCsvFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setCsvError('Пожалуйста, выберите файл формата CSV');
            return;
        }

        setCsvFile(file);
        setCsvError(null);
        setCsvResult(null);
    }, []);

    const handleCsvAnalyze = async () => {
        if (!csvFile) return;

        setCsvLoading(true);
        setCsvError(null);
        try {
            const data = await api.uploadCSV(csvFile);
            setCsvResult(data);
            await persistHistory({
                tool_type: 'csv_analysis',
                input_data: { filename: csvFile.name, size: csvFile.size },
                result_data: data,
                filename: csvFile.name,
                title: `Анализ CSV: ${csvFile.name}`,
            });
        } catch (error: any) {
            setCsvError(error.message || 'Ошибка при анализе файла');
        } finally {
            setCsvLoading(false);
        }
    };

    const resetCsv = () => {
        setCsvFile(null);
        setCsvResult(null);
        setCsvError(null);
        if (csvInputRef.current) csvInputRef.current.value = '';
    };

    const handleImgFile = useCallback((file: File) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
        const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!allowed.includes(extension)) {
            setImgError('Неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF, BMP, TIFF');
            return;
        }

        setImgFile(file);
        setImgError(null);
        setImgResult(null);

        const reader = new FileReader();
        reader.onload = (event) => setImgPreview(event.target?.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleImgAnalyze = async () => {
        if (!imgFile) return;

        setImgLoading(true);
        setImgError(null);
        try {
            const data = await api.uploadImage(imgFile);
            setImgResult(data);
            await persistHistory({
                tool_type: 'image_analysis',
                input_data: { filename: imgFile.name, size: imgFile.size },
                result_data: data,
                filename: imgFile.name,
                title: `Анализ изображения: ${imgFile.name}`,
            });
        } catch (error: any) {
            setImgError(error.message || 'Ошибка при анализе изображения');
        } finally {
            setImgLoading(false);
        }
    };

    const resetImg = () => {
        setImgFile(null);
        setImgPreview(null);
        setImgResult(null);
        setImgError(null);
        if (imgInputRef.current) imgInputRef.current.value = '';
    };

    const handleAudioFile = useCallback((file: File) => {
        const allowed = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'];
        const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!allowed.includes(extension)) {
            setAudioError(copy.audio.supported);
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            setAudioError(locale === 'en' ? 'File is too large. Maximum is 100 MB' : locale === 'kk' ? 'Файл тым үлкен. Максимум 100 MB' : 'Файл слишком большой. Максимум 100 MB');
            return;
        }

        setAudioFile(file);
        setAudioError(null);
        setAudioResult(null);
    }, [copy.audio.supported, locale]);

    const handleAudioAnalyze = async () => {
        if (!audioFile) return;

        setAudioLoading(true);
        setAudioError(null);
        try {
            const response = await api.transcribeAudio(audioFile, locale);
            setAudioResult(response);
            await persistHistory({
                tool_type: 'audio_transcription',
                input_data: { filename: audioFile.name, size: audioFile.size },
                result_data: {
                    summary: response.summary,
                    language: response.language,
                    duration: response.duration,
                    key_topics: response.key_topics,
                },
                filename: audioFile.name,
                title: `Audio: ${audioFile.name}`,
            });
        } catch (error: any) {
            setAudioError(error.message || (locale === 'en' ? 'Audio analysis failed' : locale === 'kk' ? 'Аудио талдауы сәтсіз аяқталды' : 'Ошибка при анализе аудио'));
        } finally {
            setAudioLoading(false);
        }
    };

    const resetAudio = () => {
        setAudioFile(null);
        setAudioResult(null);
        setAudioError(null);
        if (audioInputRef.current) audioInputRef.current.value = '';
    };

    useEffect(() => {
        if (!user) return;

        const refreshSupport = async () => {
            await loadSupportConversations(false, {
                showLoading: activeTab === 'support',
                syncUi: activeTab === 'support',
            });

            if (user.role === 'admin') {
                await loadSupportConversations(true, {
                    showLoading: activeTab === 'support_admin',
                    syncUi: activeTab === 'support_admin',
                });
            }
        };

        void refreshSupport();

        const intervalId = window.setInterval(() => {
            void refreshSupport();
        }, activeTab === 'support' || activeTab === 'support_admin' ? 7000 : 12000);

        return () => window.clearInterval(intervalId);
    }, [activeTab, selectedSupportId, user]);

    useEffect(() => {
        if (activeTab !== 'statistics' || user?.role !== 'admin') return;

        const intervalId = window.setInterval(() => {
            void loadAnalyticsLogs();
        }, 8000);

        return () => window.clearInterval(intervalId);
    }, [activeTab, user?.role]);

    useEffect(() => {
        if (activeTab !== 'system_monitor' || user?.role !== 'admin') return;

        const intervalId = window.setInterval(() => {
            void loadSystemMonitor();
        }, 10000);

        return () => window.clearInterval(intervalId);
    }, [activeTab, user?.role]);

    if (!user) {
        return (
            <div className="workspace-loader-wrap">
                <div className="workspace-loader" />
                <p className="workspace-loader-text">Загрузка workspace…</p>
            </div>
        );
    }

    return (
        <div
            className="workspace-shell min-h-screen flex"
            style={{ fontSize: fontSizeMap[settingsForm.custom_settings.ui_font_size] || '16px' }}
        >
            <WorkspaceSidebar
                user={user}
                locale={locale}
                activeTab={activeTab}
                sidebarOpen={sidebarOpen}
                mobileMenuOpen={mobileMenuOpen}
                supportUnreadCount={supportUnreadCount}
                supportAdminUnreadCount={supportAdminUnreadCount}
                onTabChange={setActiveTab}
                onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
                onCloseMobileMenu={() => setMobileMenuOpen(false)}
                onLogout={handleLogout}
            />

            {mobileMenuOpen && (
                <div
                    className="workspace-mobile-overlay fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <main className="flex-1 min-w-0 overflow-y-auto">
                <WorkspaceTopBar
                    activeTab={activeTab}
                    locale={locale}
                    user={user}
                    compactMode={settingsForm.custom_settings.compact_mode}
                    onOpenMobileMenu={() => setMobileMenuOpen(true)}
                />

                <div
                    key={activeTab}
                    className={`workspace-tab-panel max-w-6xl mx-auto ${settingsForm.custom_settings.compact_mode ? 'p-4' : 'p-6'}`}
                >
                    {activeTab === 'home' && (
                        <HomeTab locale={locale} user={user} onTabChange={setActiveTab} />
                    )}

                    {activeTab === 'articles' && (
                        <ArticlesTab locale={locale} user={user} refreshToken={articlesRefresh} />
                    )}

                    {activeTab === 'pipeline' && (
                        <PipelineTab locale={locale} onOpenArticles={() => setActiveTab('articles')} />
                    )}

                    {activeTab === 'profile' && (
                        <ProfileTab
                            locale={locale}
                            user={user}
                            editingProfile={editingProfile}
                            profileForm={profileForm}
                            savingProfile={savingProfile}
                            avatarPreset={avatarPreset}
                            avatarEmoji={avatarEmoji}
                            onEditToggle={() => setEditingProfile((prev) => !prev)}
                            onProfileFormChange={(field, value) => setProfileForm((prev) => ({ ...prev, [field]: value }))}
                            onAvatarPresetChange={setAvatarPreset}
                            onAvatarEmojiChange={setAvatarEmoji}
                            onAvatarReset={() => {
                                setAvatarPreset('aurora');
                                setAvatarEmoji('');
                            }}
                            onSave={handleProfileSave}
                            onCancel={() => setEditingProfile(false)}
                        />
                    )}

                    {activeTab === 'validate' && (
                        <ValidateTab
                            locale={locale}
                            validateTitle={validateTitle}
                            validateContent={validateContent}
                            validateLoading={validateLoading}
                            validateResult={validateResult}
                            onTitleChange={setValidateTitle}
                            onContentChange={setValidateContent}
                            onValidate={handleValidate}
                            onReset={() => setValidateResult(null)}
                            onSaveAsArticle={
                                validateResult
                                    ? () =>
                                          void handleSaveAsArticle(
                                              validateTitle || 'Проверка контента',
                                              `${validateContent}\n\nОценка: ${validateResult.score}/100\nПроблемы: ${validateResult.issues.join('; ') || 'нет'}`,
                                          )
                                    : undefined
                            }
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'document' && (
                        <DocumentTab
                            locale={locale}
                            docFile={docFile}
                            docLoading={docLoading}
                            docResult={docResult}
                            docError={docError}
                            docInputRef={docInputRef}
                            onFileSelect={handleDocFile}
                            onAnalyze={handleDocAnalyze}
                            onReset={resetDoc}
                            onSaveAsArticle={
                                docResult
                                    ? () =>
                                          void handleSaveAsArticle(
                                              docResult.filename,
                                              [docResult.ai_summary, ...docResult.ai_recommendations].filter(Boolean).join('\n\n'),
                                          )
                                    : undefined
                            }
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'csv' && (
                        <CsvTab
                            locale={locale}
                            csvFile={csvFile}
                            csvLoading={csvLoading}
                            csvResult={csvResult}
                            csvError={csvError}
                            csvInputRef={csvInputRef}
                            onFileSelect={handleCsvFile}
                            onAnalyze={handleCsvAnalyze}
                            onReset={resetCsv}
                            onSaveAsArticle={
                                csvResult
                                    ? () => {
                                          const p = buildArticleFromCsvResult(csvResult);
                                          void handleSaveAsArticle(p.title, p.content);
                                      }
                                    : undefined
                            }
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'image' && (
                        <ImageTab
                            locale={locale}
                            imgFile={imgFile}
                            imgPreview={imgPreview}
                            imgLoading={imgLoading}
                            imgResult={imgResult}
                            imgError={imgError}
                            imgInputRef={imgInputRef}
                            onFileSelect={handleImgFile}
                            onAnalyze={handleImgAnalyze}
                            onReset={resetImg}
                            onSaveAsArticle={
                                imgResult
                                    ? () => {
                                          const p = buildArticleFromImageResult(imgResult);
                                          void handleSaveAsArticle(p.title, p.content);
                                      }
                                    : undefined
                            }
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'audio' && (
                        <AudioTab
                            locale={locale}
                            audioFile={audioFile}
                            audioLoading={audioLoading}
                            audioResult={audioResult}
                            audioError={audioError}
                            audioInputRef={audioInputRef}
                            onFileSelect={handleAudioFile}
                            onAnalyze={handleAudioAnalyze}
                            onReset={resetAudio}
                            onSaveAsArticle={
                                audioResult
                                    ? () => {
                                          const p = buildArticleFromAudioResult(audioResult);
                                          void handleSaveAsArticle(p.title, p.content);
                                      }
                                    : undefined
                            }
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'history' && (
                        <HistoryTab
                            locale={locale}
                            historyFilter={historyFilter}
                            historyLoading={historyLoading}
                            historyItems={historyItems}
                            historyPage={historyPage}
                            historyTotal={historyTotal}
                            onFilterChange={(value) => {
                                setHistoryFilter(value);
                                setHistoryPage(1);
                            }}
                            onPreviousPage={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                            onNextPage={() => setHistoryPage((prev) => prev + 1)}
                            onExportPDF={handleExportPDF}
                            onDeleteHistory={handleDeleteHistory}
                            onSaveAsArticle={(item) => void handleSaveHistoryAsArticle(item)}
                            saveArticleLoading={articleSaveLoading}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsTab
                            locale={locale}
                            settingsLoading={settingsLoading}
                            settingsForm={settingsForm}
                            savingSettings={savingSettings}
                            onSettingsChange={(updater) => setSettingsForm((prev) => updater(prev))}
                            onSave={handleSaveSettings}
                        />
                    )}

                    {activeTab === 'subscription' && (
                        <SubscriptionTab
                            locale={locale}
                            loading={subscriptionLoading}
                            plans={subscriptionPlans}
                            subscription={subscription}
                            paymentNote={subscriptionPaymentNote}
                            changingPlanId={changingPlanId}
                            onSelectPlan={(planId) => void handleChangePlan(planId)}
                        />
                    )}

                    {activeTab === 'statistics' && (
                        <StatisticsTab
                            locale={locale}
                            user={user}
                            statsLoading={statsLoading}
                            statistics={statistics}
                            activityLoading={activityLoading}
                            activityItems={activityItems}
                        />
                    )}

                    {activeTab === 'admin_control' && user.role === 'admin' && (
                        <AdminControlTab
                            locale={locale}
                            currentUser={user}
                            loading={adminLoading}
                            usersLoading={adminUsersLoading}
                            filesLoading={adminFilesLoading}
                            overview={adminOverview}
                            users={adminUsers}
                            usersTotal={adminUsersTotal}
                            files={adminFiles}
                            filesTotal={adminFilesTotal}
                            userSearch={adminUserSearch}
                            fileSearch={adminFileSearch}
                            userRoleFilter={adminUserRoleFilter}
                            fileToolFilter={adminFileToolFilter}
                            onUserSearchChange={setAdminUserSearch}
                            onFileSearchChange={setAdminFileSearch}
                            onUserRoleFilterChange={setAdminUserRoleFilter}
                            onFileToolFilterChange={setAdminFileToolFilter}
                            onRefresh={() => void loadAdminControl()}
                            onUpdateUser={(userId, data) => void handleAdminUpdateUser(userId, data)}
                            onDeleteUser={(userId) => void handleAdminDeleteUser(userId)}
                        />
                    )}

                    {activeTab === 'system_monitor' && user.role === 'admin' && (
                        <SystemMonitorTab
                            locale={locale}
                            loading={monitorLoading}
                            monitor={systemMonitor}
                        />
                    )}

                    {activeTab === 'support' && (
                        <SupportCenterTab
                            locale={locale}
                            user={user}
                            loading={supportLoading}
                            conversations={supportItems}
                            selectedConversationId={selectedSupportId}
                            selectedConversation={selectedSupportConversation}
                            draftMessage={supportDraftMessage}
                            newSubject={newSupportSubject}
                            newMessage={newSupportMessage}
                            sending={supportSending}
                            statusUpdating={supportStatusUpdating}
                            onSelectConversation={(conversationId) => {
                                setSupportDraftMessage('');
                                void loadSupportConversation(conversationId, false);
                            }}
                            onDraftMessageChange={setSupportDraftMessage}
                            onNewSubjectChange={setNewSupportSubject}
                            onNewMessageChange={setNewSupportMessage}
                            onSendMessage={() => void handleSendSupportMessage(false)}
                            onCreateConversation={() => void handleCreateSupportConversation()}
                            onStatusChange={() => undefined}
                        />
                    )}

                    {activeTab === 'support_admin' && user.role === 'admin' && (
                        <SupportCenterTab
                            locale={locale}
                            user={user}
                            adminMode
                            loading={supportLoading}
                            conversations={supportItems}
                            selectedConversationId={selectedSupportId}
                            selectedConversation={selectedSupportConversation}
                            draftMessage={supportDraftMessage}
                            newSubject=""
                            newMessage=""
                            sending={supportSending}
                            statusUpdating={supportStatusUpdating}
                            onSelectConversation={(conversationId) => {
                                setSupportDraftMessage('');
                                void loadSupportConversation(conversationId, true);
                            }}
                            onDraftMessageChange={setSupportDraftMessage}
                            onNewSubjectChange={() => undefined}
                            onNewMessageChange={() => undefined}
                            onSendMessage={() => void handleSendSupportMessage(true)}
                            onCreateConversation={() => undefined}
                            onStatusChange={(status) => void handleChangeSupportStatus(status)}
                        />
                    )}

                    {activeTab === 'chat' && (
                        <ChatTab
                            locale={locale}
                            user={user}
                            chatMessages={chatMessages}
                            chatInput={chatInput}
                            chatLoading={chatLoading}
                            chatEndRef={chatEndRef}
                            onInputChange={setChatInput}
                            onSendMessage={handleSendMessage}
                            onResetChat={() => setChatMessages(getInitialChatMessages(locale).map((message) => ({ ...message, timestamp: new Date() })))}
                            onSaveAsArticle={() => {
                                const lastAssistant = [...chatMessages].reverse().find((m) => m.role === 'assistant');
                                const lastUser = [...chatMessages].reverse().find((m) => m.role === 'user');
                                if (!lastAssistant) return;
                                const title = (lastUser?.content || 'AI диалог').slice(0, 80);
                                const content = `Вопрос:\n${lastUser?.content || '—'}\n\nОтвет:\n${lastAssistant.content}`;
                                void handleSaveAsArticle(title, content);
                            }}
                            saveArticleLoading={articleSaveLoading}
                            canSaveAsArticle={chatMessages.some((m) => m.role === 'assistant')}
                        />
                    )}
                </div>
            </main>
            <ToastHost />
        </div>
    );
}
