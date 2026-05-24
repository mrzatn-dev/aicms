'use client';

import { Calendar, Mail, Pencil, RotateCcw, Shield, Sparkles, User } from 'lucide-react';

import { getLocaleTag, getWorkspaceCopy } from '../../i18n';
import type { LocaleCode, UserInfo } from '../../types';

interface ProfileTabProps {
    locale: LocaleCode;
    user: UserInfo;
    editingProfile: boolean;
    profileForm: { full_name: string; email: string };
    savingProfile: boolean;
    avatarPreset: string;
    avatarEmoji: string;
    onEditToggle: () => void;
    onProfileFormChange: (field: 'full_name' | 'email', value: string) => void;
    onAvatarPresetChange: (preset: string) => void;
    onAvatarEmojiChange: (emoji: string) => void;
    onAvatarReset: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export function ProfileTab({
    locale,
    user,
    editingProfile,
    profileForm,
    savingProfile,
    avatarPreset,
    avatarEmoji,
    onEditToggle,
    onProfileFormChange,
    onAvatarPresetChange,
    onAvatarEmojiChange,
    onAvatarReset,
    onSave,
    onCancel,
}: ProfileTabProps) {
    const copy = getWorkspaceCopy(locale).profile;
    const localeTag = getLocaleTag(locale);
    const avatarGradients: Record<string, string> = {
        aurora: 'from-primary-500 to-violet-500',
        ocean: 'from-cyan-500 to-blue-500',
        sunset: 'from-orange-500 to-rose-500',
        forest: 'from-emerald-500 to-teal-500',
        mono: 'from-surface-700 to-surface-500',
        gold: 'from-amber-500 to-orange-600',
    };
    const availablePresets = Object.keys(avatarGradients);
    const avatarText = (user.full_name || user.username).charAt(0).toUpperCase();
    const avatarLabel = locale === 'en' ? 'Avatar' : locale === 'kk' ? 'Аватар' : 'Аватар';
    const avatarStyleLabel = locale === 'en' ? 'Style' : locale === 'kk' ? 'Стиль' : 'Стиль';
    const avatarEmojiLabel = locale === 'en' ? 'Emoji badge' : locale === 'kk' ? 'Эмодзи белгісі' : 'Эмодзи-бейдж';
    const avatarResetLabel = locale === 'en' ? 'Reset avatar' : locale === 'kk' ? 'Аватарды қалпына келтіру' : 'Сбросить аватар';
    const currentGradient = avatarGradients[avatarPreset] || avatarGradients.aurora;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-surface-900">{copy.title}</h2>
                    <button
                        onClick={onEditToggle}
                        className="p-2 text-surface-700/50 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-5 mb-6">
                    <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg shadow-primary-500/20`}>
                        <span className="text-3xl font-bold text-white">
                            {avatarText}
                        </span>
                        {avatarEmoji && (
                            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-surface-200 flex items-center justify-center text-sm">
                                {avatarEmoji}
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-xl font-semibold text-surface-900">{user.full_name || user.username}</p>
                        <p className="text-sm text-surface-700/60">@{user.username}</p>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-surface-800">{avatarLabel}</p>
                        <button
                            type="button"
                            onClick={onAvatarReset}
                            className="text-xs px-2 py-1 rounded-lg border border-surface-200 hover:border-surface-300 text-surface-600 hover:text-surface-800 inline-flex items-center gap-1"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {avatarResetLabel}
                        </button>
                    </div>
                    <div>
                        <p className="text-xs text-surface-500 mb-2">{avatarStyleLabel}</p>
                        <div className="flex flex-wrap gap-2">
                            {availablePresets.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onAvatarPresetChange(preset)}
                                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[preset]} border ${avatarPreset === preset ? 'border-surface-900' : 'border-transparent'} transition-all`}
                                    aria-label={`Avatar preset ${preset}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-surface-500 mb-1">{avatarEmojiLabel}</label>
                        <div className="relative">
                            <Sparkles className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={avatarEmoji}
                                onChange={(e) => onAvatarEmojiChange(e.target.value.slice(0, 2))}
                                placeholder={locale === 'en' ? 'e.g. 🚀' : locale === 'kk' ? 'мысалы 🚀' : 'например 🚀'}
                                className="input-field pl-9"
                            />
                        </div>
                    </div>
                </div>

                {editingProfile ? (
                    <div className="space-y-4 pt-4 border-t border-surface-200/60">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">{copy.fullName}</label>
                            <input
                                type="text"
                                value={profileForm.full_name}
                                onChange={(e) => onProfileFormChange('full_name', e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">{copy.email}</label>
                            <input
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => onProfileFormChange('email', e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={onSave} disabled={savingProfile} className="btn-primary text-sm !px-5 !py-2.5 disabled:opacity-60">
                                {savingProfile ? copy.saving : copy.save}
                            </button>
                            <button onClick={onCancel} className="btn-secondary text-sm !px-5 !py-2.5">{copy.cancel}</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-surface-200/60">
                        <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                            <Mail className="w-5 h-5 text-primary-500" />
                            <div>
                                <p className="text-xs text-surface-700/50">{copy.email}</p>
                                <p className="text-sm font-medium text-surface-900">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                            <Shield className="w-5 h-5 text-violet-500" />
                            <div>
                                <p className="text-xs text-surface-700/50">{copy.role}</p>
                                <p className="text-sm font-medium text-surface-900">{user.role === 'admin' ? copy.admin : copy.user}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-xs text-surface-700/50">{copy.registeredAt}</p>
                                <p className="text-sm font-medium text-surface-900">{new Date(user.created_at).toLocaleDateString(localeTag)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                            <User className="w-5 h-5 text-amber-500" />
                            <div>
                                <p className="text-xs text-surface-700/50">{copy.username}</p>
                                <p className="text-sm font-medium text-surface-900">@{user.username}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
