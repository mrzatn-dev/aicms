'use client';

import { Bot, Loader2, Palette, Sparkles } from 'lucide-react';

import { getWorkspaceCopy } from '../../i18n';
import type { LocaleCode, SettingsFormState } from '../../types';

interface SettingsTabProps {
    locale: LocaleCode;
    settingsLoading: boolean;
    settingsForm: SettingsFormState;
    savingSettings: boolean;
    onSettingsChange: (updater: (prev: SettingsFormState) => SettingsFormState) => void;
    onSave: () => void;
}

export function SettingsTab({
    locale,
    settingsLoading,
    settingsForm,
    savingSettings,
    onSettingsChange,
    onSave,
}: SettingsTabProps) {
    const copy = getWorkspaceCopy(locale).settings;

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {settingsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary-500" />
                            {copy.prompts}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.chatPrompt}</label>
                                <textarea
                                    value={settingsForm.chat_system_prompt}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, chat_system_prompt: e.target.value }))}
                                    placeholder={copy.chatPlaceholder}
                                    rows={3}
                                    className="input-field w-full resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.validationPrompt}</label>
                                <textarea
                                    value={settingsForm.validation_prompt}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, validation_prompt: e.target.value }))}
                                    placeholder={copy.validationPlaceholder}
                                    rows={3}
                                    className="input-field w-full resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.documentPrompt}</label>
                                <textarea
                                    value={settingsForm.document_analysis_prompt}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, document_analysis_prompt: e.target.value }))}
                                    placeholder={copy.documentPlaceholder}
                                    rows={3}
                                    className="input-field w-full resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-500" />
                            {copy.modelSettings}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.model}</label>
                                <select
                                    value={settingsForm.preferred_model}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, preferred_model: e.target.value }))}
                                    className="input-field w-full"
                                >
                                    <option value="deepseek-chat">DeepSeek Chat</option>
                                    <option value="deepseek-coder">DeepSeek Coder</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.maxTokens}</label>
                                <input
                                    type="number"
                                    value={settingsForm.max_tokens}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, max_tokens: parseInt(e.target.value, 10) || 0 }))}
                                    min={100}
                                    max={8000}
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">Temperature ({settingsForm.temperature})</label>
                                <input
                                    type="range"
                                    value={settingsForm.temperature}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    className="w-full"
                                />
                                <p className="text-xs text-surface-400 mt-1">{copy.temperatureHint}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                            <Palette className="w-5 h-5 text-emerald-500" />
                            {copy.interface}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.theme}</label>
                                <select
                                    value={settingsForm.theme}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, theme: e.target.value }))}
                                    className="input-field w-full"
                                >
                                    <option value="light">{copy.light}</option>
                                    <option value="dark">{copy.dark}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.language}</label>
                                <select
                                    value={settingsForm.language}
                                    onChange={(e) => onSettingsChange((prev) => ({ ...prev, language: e.target.value }))}
                                    className="input-field w-full"
                                >
                                    <option value="ru">{copy.languages.ru}</option>
                                    <option value="en">{copy.languages.en}</option>
                                    <option value="kk">{copy.languages.kk}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">{copy.fontSize}</label>
                                <select
                                    value={settingsForm.custom_settings.ui_font_size}
                                    onChange={(e) => onSettingsChange((prev) => ({
                                        ...prev,
                                        custom_settings: {
                                            ...prev.custom_settings,
                                            ui_font_size: e.target.value,
                                        },
                                    }))}
                                    className="input-field w-full"
                                >
                                    <option value="sm">{copy.fontSizes.sm}</option>
                                    <option value="md">{copy.fontSizes.md}</option>
                                    <option value="lg">{copy.fontSizes.lg}</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-surface-200 px-4 py-3 bg-surface-50">
                                <div>
                                    <p className="text-sm font-medium text-surface-900">{copy.compact}</p>
                                    <p className="text-xs text-surface-500">{copy.compactHint}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onSettingsChange((prev) => ({
                                        ...prev,
                                        custom_settings: {
                                            ...prev.custom_settings,
                                            compact_mode: !prev.custom_settings.compact_mode,
                                        },
                                    }))}
                                    className={`relative h-7 w-12 rounded-full transition-colors ${settingsForm.custom_settings.compact_mode ? 'bg-primary-600' : 'bg-surface-300'}`}
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${settingsForm.custom_settings.compact_mode ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={onSave} disabled={savingSettings} className="btn-primary w-full !py-3">
                        {savingSettings ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{copy.saving}</> : copy.save}
                    </button>
                </>
            )}
        </div>
    );
}
