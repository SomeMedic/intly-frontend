"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { LockKeyhole, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { themePacks, useUiPreferences } from "@/hooks/use-ui-preferences";
import { useAppearancePreferences } from "@/hooks/use-appearance-preferences";
import { api } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AiPreferences, NotificationCategory, NotificationPreference, UserSettingsPayload } from "@/types";
import { settingsApi } from "../api/settings-api";
import { densityLabels, digestModeLabels, notificationChannelLabels, type SettingsLocale } from "../settings-labels";
import { clearAiDraft, clearDraftHistoryRequest, readAiDraft, writeAiDraft, type AiDraft } from "../settings-drafts";

export const settingsTabs = [
  ["account", "Аккаунт", "Account"], ["appearance", "Оформление", "Appearance"],
  ["language", "Язык и время", "Language & time"], ["notifications", "Уведомления", "Notifications"],
  ["telegram", "Telegram", "Telegram"], ["profiles", "Профили", "Profiles"],
  ["ai", "AI и промпты", "AI & prompts"], ["api", "API-токены", "API tokens"],
  ["webhooks", "Webhooks", "Webhooks"], ["search", "Поиск", "Search"], ["export", "Экспорт", "Export"]
] as const;
export type SettingsTab = typeof settingsTabs[number][0];
const selectClass = "h-[var(--control-height)] w-full rounded-md border bg-card px-3 text-sm";
const panelClass = "min-w-0 space-y-4 rounded-lg border bg-card p-[var(--card-padding)]";

export function SettingsAppearance({ locale }: { locale: SettingsLocale }) {
  const { themePack, mode, density, reducedMotion } = useUiPreferences();
  const { updateAppearance, pending, error } = useAppearancePreferences();
  const t = (ru: string, en: string) => locale === "en" ? en : ru;
  return <section className={panelClass} aria-labelledby="appearance-title">
    <h2 id="appearance-title" className="font-semibold">{t("Оформление", "Appearance")}</h2>
    <p className="text-sm text-muted-foreground">{t("Настройки применяются сразу и сохраняются для вашего аккаунта.", "Changes apply immediately and are saved to your account.")}</p>
    <fieldset className="space-y-2"><legend className="text-sm">{t("Цветовая палитра", "Color palette")}</legend><div className="grid gap-2 sm:grid-cols-2">{themePacks.map(pack => <button type="button" key={pack.id} aria-pressed={themePack === pack.id} className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm ${themePack === pack.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`} onClick={() => void updateAppearance({ themePack: pack.id }).catch(() => {})}><span className="size-5 rounded-full" style={{ background: pack.swatch }} aria-hidden="true" />{pack.label}{themePack === pack.id ? <span className="ml-auto text-xs">{t("Выбрана", "Selected")}</span> : null}</button>)}</div></fieldset>
    <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>{t("Режим", "Mode")}</span><select className={selectClass} value={mode} onChange={event => void updateAppearance({ mode: event.target.value as typeof mode }).catch(() => {})}><option value="light">{t("Светлый", "Light")}</option><option value="dark">{t("Тёмный", "Dark")}</option><option value="system">{t("Как в системе", "System")}</option></select></label><label className="space-y-1 text-sm"><span>{t("Плотность интерфейса", "Interface density")}</span><select className={selectClass} value={density} onChange={event => void updateAppearance({ density: event.target.value as typeof density }).catch(() => {})}><option value="compact">{densityLabels[locale].compact}</option><option value="comfortable">{densityLabels[locale].comfortable}</option></select></label></div>
    <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"><span>{t("Уменьшить движение", "Reduce motion")}</span><Switch checked={reducedMotion} onCheckedChange={checked => void updateAppearance({ reducedMotion: checked }).catch(() => {})} /></label>
    <p className="text-xs text-muted-foreground">{t("Системное уменьшение движения также учитывается.", "Your operating system's reduced motion preference is also respected.")}</p>
    <p role="status" className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>{error ? t("Не удалось сохранить оформление. Восстановлены сохранённые значения.", "Could not save appearance. Saved values have been restored.") : pending ? t("Сохраняем…", "Saving…") : t("Сохранено", "Saved")}</p>
  </section>;
}

export function SettingsPassword({ locale }: { locale: SettingsLocale }) {
  const { logout } = useAuth();
  const t = (ru: string, en: string) => locale === "en" ? en : ru;
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: () => settingsApi.changePassword({ currentPassword: values.current, newPassword: values.next }), onSuccess: () => { setValues({ current: "", next: "", confirm: "" }); logout(); } });
  return <form className="space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); if (values.next !== values.confirm) { setValidation(t("Пароли должны совпадать.", "Passwords must match.")); return; } setValidation(""); mutation.mutate(); }}>
    <h3 className="text-sm font-semibold">{t("Смена пароля", "Change password")}</h3>
    <p className="text-xs text-muted-foreground">{t("После смены пароля потребуется войти заново на всех устройствах.", "After changing your password, sign in again on every device.")}</p>
    <div className="grid gap-3 sm:grid-cols-2">{([["current", "Текущий пароль", "Current password"], ["next", "Новый пароль", "New password"], ["confirm", "Повторите новый пароль", "Confirm new password"]] as const).map(([key, ru, en]) => <label key={key} className="space-y-1 text-sm"><span>{t(ru,en)}</span><Input type="password" autoComplete={key === "current" ? "current-password" : "new-password"} minLength={key === "current" ? 1 : 8} required value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
    {validation || mutation.isError ? <p role="alert" className="text-sm text-destructive">{validation || t("Не удалось сменить пароль. Проверьте текущий пароль и повторите.", "Could not change your password. Check your current password and try again.")}</p> : null}
    <Button type="submit" variant="outline" loading={mutation.isPending} disabled={!values.current || values.next.length < 8 || !values.confirm}>{t("Сменить пароль", "Change password")}</Button>
  </form>;
}

const categoryLabels: Record<SettingsLocale, Record<NotificationCategory,string>> = {
  ru: { opportunity: "Возможности и правила", ai: "Результаты AI", workflow: "Задачи и сроки", collaboration: "Комментарии и упоминания", system: "Системные уведомления", admin: "Административные события" },
  en: { opportunity: "Opportunities & watchlists", ai: "AI results", workflow: "Tasks & deadlines", collaboration: "Comments & mentions", system: "System notifications", admin: "Admin events" }
};

export function SettingsNotifications({ locale, value, timezone, isAdmin, saving, onSave }: { locale: SettingsLocale; value: NotificationPreference; timezone: string; isAdmin: boolean; saving: boolean; onSave: (patch: Partial<NotificationPreference>) => Promise<NotificationPreference> }) {
  const t = (ru: string, en: string) => locale === "en" ? en : ru;
  const categories: NotificationCategory[] = ["opportunity","ai","workflow","collaboration","system",...(isAdmin ? ["admin" as const] : [])];
  return <section className={panelClass}>
    <h2 className="font-semibold">{t("Уведомления", "Notifications")}</h2>
    <div className="grid gap-3 sm:grid-cols-3">{(["inApp","email","telegram"] as const).map(channel => <label key={channel} className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-3 text-sm"><span className="min-w-0 break-words">{notificationChannelLabels[locale][channel]}</span><Switch disabled={saving} checked={value[channel]} onCheckedChange={checked => void onSave({ [channel]: checked }).catch(() => {})} /></label>)}</div>
    <label className="block max-w-sm space-y-1 text-sm"><span>{t("Частота дайджеста", "Digest cadence")}</span><select className={selectClass} value={value.digestMode === "digest" ? "daily" : value.digestMode} disabled={saving} onChange={event => void onSave({ digestMode: event.target.value as NotificationPreference["digestMode"] }).catch(() => {})}><option value="instant">{digestModeLabels[locale].instant}</option><option value="daily">{digestModeLabels[locale].daily}</option><option value="weekly">{digestModeLabels[locale].weekly}</option></select></label>
    <p className="text-xs text-muted-foreground">{t("Дайджест объединяет события по категориям. Повторения одной возможности сокращаются. В приложении события доступны сразу.", "Digests group events by category and reduce repeated opportunity alerts. In-app events remain available immediately.")}</p>
    <h3 className="border-t pt-4 text-sm font-semibold">{t("Каналы по типу события", "Channels by event type")}</h3>
    <div className="space-y-2">{categories.map(category => <div className="min-w-0 space-y-3 rounded-md border p-3" key={category}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-medium">{categoryLabels[locale][category]}</h4><select className={`${selectClass} w-auto max-w-full`} aria-label={`${categoryLabels[locale][category]} — ${t("Доставка", "Delivery")}`} value={value.eventChannels?.[category]?.mode ?? "inherit"} disabled={saving} onChange={event => { const row = { ...value.eventChannels?.[category] }; if (event.target.value === "inherit") delete row.mode; else row.mode = event.target.value as "instant"|"digest"; void onSave({ eventChannels: { ...value.eventChannels, [category]: row } }).catch(() => {}); }}><option value="inherit">{t("Общая настройка", "Default cadence")}</option><option value="instant">{t("Сразу", "Instant")}</option><option value="digest">{t("Дайджест", "Digest")}</option></select></div><div className="grid grid-cols-3 gap-2">{(["inApp","email","telegram"] as const).map(channel => <label key={channel} className="flex min-w-0 flex-col items-start gap-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="min-h-8 sm:min-h-0">{notificationChannelLabels[locale][channel]}</span><Switch aria-label={`${categoryLabels[locale][category]} — ${notificationChannelLabels[locale][channel]}`} disabled={saving} checked={value.eventChannels?.[category]?.[channel] ?? value[channel]} onCheckedChange={checked => void onSave({ eventChannels: { ...value.eventChannels, [category]: { ...value.eventChannels?.[category], [channel]: checked } } }).catch(() => {})} /></label>)}</div></div>)}</div>
    <QuietHours locale={locale} value={value.quietHours} timezone={timezone} saving={saving} onSave={onSave} />
  </section>;
}

function QuietHours({ locale, value, timezone, saving, onSave }: { locale:SettingsLocale; value:NotificationPreference["quietHours"]; timezone:string; saving:boolean; onSave:(patch:Partial<NotificationPreference>)=>Promise<NotificationPreference> }) {
  const t = (ru:string,en:string) => locale === "en" ? en : ru;
  const [enabled,setEnabled] = useState(Boolean(value));
  const [start,setStart] = useState(value?.start ?? "22:00");
  const [end,setEnd] = useState(value?.end ?? "08:00");
  const [zone,setZone] = useState(value?.timezone ?? timezone);
  const [message,setMessage] = useState("");
  return <form className="space-y-3 border-t pt-4" onSubmit={async event=> { event.preventDefault(); try { new Intl.DateTimeFormat("en",{timeZone:zone}).format(); if(enabled && start === end) { setMessage(t("Начало и конец должны различаться.","Start and end must differ.")); return; } await onSave({ quietHours: enabled ? {start,end,timezone:zone} : null }); setMessage(t("Тихие часы сохранены.","Quiet hours saved.")); } catch {setMessage(t("Не удалось сохранить. Проверьте часовой пояс и повторите.","Could not save. Check the timezone and try again."));} }}><label className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{t("Тихие часы", "Quiet hours")}</span><Switch checked={enabled} onCheckedChange={setEnabled} /></label><p className="text-xs text-muted-foreground">{t("Email и Telegram ждут окончания тихих часов. Уведомления в приложении появляются сразу.", "Email and Telegram wait until quiet hours end. In-app notifications appear immediately.")}</p>{enabled ? <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1 text-sm"><span>{t("Начало", "Start")}</span><Input type="time" required value={start} onChange={event=>setStart(event.target.value)} /></label><label className="space-y-1 text-sm"><span>{t("Конец", "End")}</span><Input type="time" required value={end} onChange={event=>setEnd(event.target.value)} /></label><label className="space-y-1 text-sm"><span>{t("Часовой пояс", "Timezone")}</span><Input required value={zone} onChange={event=>setZone(event.target.value)} /></label></div> : null}<Button type="submit" variant="outline" loading={saving}><Save className="size-4" />{t("Сохранить тихие часы", "Save quiet hours")}</Button>{message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}</form>;
}

const supportedVariables = ["profile","resume","opportunity","knowledge","language"];
export function SettingsAi({ ownerId, locale, value, saving, onSave, onDirty }: { ownerId:string; locale:SettingsLocale; value:AiPreferences; saving:boolean; onSave:(patch:Partial<AiPreferences>)=>Promise<AiPreferences>; onDirty:(dirty:boolean)=>void }) {
  const t = (ru:string,en:string) => locale === "en" ? en : ru;
  const [initial] = useState(() => ({ baseline: { language:value.language,userPreferences:value.userPreferences,customPrompt:value.customPrompt }, recovered: readAiDraft(ownerId) }));
  const [draft,setDraft] = useState<AiDraft>(initial.recovered?.draft ?? initial.baseline);
  const [baseline,setBaseline] = useState<AiDraft>(initial.baseline);
  const [message,setMessage] = useState(initial.recovered ? JSON.stringify(initial.recovered.baseline) !== JSON.stringify(initial.baseline) ? t("Черновик восстановлен. Сохранённые настройки изменились — проверьте текст перед сохранением.", "Draft restored. Saved preferences have changed; review your text before saving.") : t("Несохранённый черновик восстановлен.", "Your unsaved draft has been restored.") : "");
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const edit = (patch: Partial<AiDraft>) => {
    const next = { ...draft, ...patch };
    writeAiDraft(ownerId, next, baseline);
    setDraft(next);
    setMessage("");
  };
  useLayoutEffect(()=>{onDirty(dirty); return()=>onDirty(false);},[dirty,onDirty]);
  useLayoutEffect(()=>{if(!dirty)return; const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue = "";}; window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  return <form className={panelClass} onSubmit={async event=>{event.preventDefault();const unsupported=[...`${draft.userPreferences} ${draft.customPrompt}`.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map(match=>match[1]).filter(name=>!supportedVariables.includes(name));if(unsupported.length){setMessage(`${t("Неизвестные переменные", "Unsupported variables")}: ${[...new Set(unsupported)].join(", ")}`);return;}try{const saved=await onSave(draft);const next={language:saved.language,userPreferences:saved.userPreferences,customPrompt:saved.customPrompt};clearAiDraft(ownerId);clearDraftHistoryRequest(ownerId);setDraft(next);setBaseline(next);setMessage(t("Предпочтения сохранены.", "Preferences saved."));}catch{setMessage(t("Не удалось сохранить. Текст остаётся в редакторе.", "Could not save. Your text remains in the editor."));}}}>
    <h2 className="font-semibold">{t("AI и промпты", "AI & prompts")}</h2><label className="block max-w-sm space-y-1 text-sm"><span>{t("Язык AI", "AI language")}</span><select className={selectClass} value={draft.language} disabled={saving} onChange={event=>edit({language:event.target.value as "ru"|"en"})}><option value="ru">Русский</option><option value="en">English</option></select></label>
    <label className="block space-y-1 text-sm"><span>{t("Пользовательские предпочтения", "User preferences")}</span><Textarea rows={4} maxLength={8000} value={draft.userPreferences} disabled={saving} onChange={event=>edit({userPreferences:event.target.value})} placeholder={t("Что учитывать: опыт, стиль, приоритеты…", "Experience, style, priorities to consider…")} /></label>
    <label className="block space-y-1 text-sm"><span>{t("Дополнительный промпт", "Custom prompt")}</span><Textarea rows={6} maxLength={8000} value={draft.customPrompt} disabled={saving} onChange={event=>edit({customPrompt:event.target.value})} /></label>
    <div className="flex flex-wrap gap-2">{supportedVariables.map(name=><code key={name} className="rounded bg-muted px-2 py-1 text-xs">{`{{${name}}}`}</code>)}</div>
    <details className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">{t("Предпросмотр структуры промпта", "Prompt structure preview")}</summary><div className="mt-3 space-y-3 text-sm">{[[t("Системные правила", "System rules"),t("Защищённые инструкции INTLY, правила достоверности и границы доступа.", "Protected INTLY instructions, accuracy rules and access boundaries.")],[t("Задача", "Task"),t("Инструкции выбранного сценария: анализ, отклик или адаптация.", "Instructions for the selected analysis, response or adaptation task.")],[t("Контекст и пользовательские предпочтения", "Context & user preferences"),t("Профиль, резюме, возможность и база знаний. Ваши тексты направляют стиль и акценты.", "Profile, resume, opportunity and knowledge. Your text guides style and emphasis.")],[t("Формат результата", "Output format"),t("Защищённая схема результата и проверки ответа.", "Protected output schema and response validation.")]].map(([title,description],index)=><div key={title} className="rounded bg-muted/40 p-3"><h3 className="flex items-center gap-2 font-medium">{index !== 2 ? <LockKeyhole className="size-3.5" aria-hidden="true" /> : null}{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p>{index===2 ? <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs">{draft.userPreferences}{"\n"}{draft.customPrompt}</pre> : null}</div>)}</div></details>
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" loading={saving} disabled={!dirty}><Save className="size-4" />{t("Сохранить предпочтения", "Save preferences")}</Button>{dirty ? <Button type="button" variant="outline" disabled={saving} onClick={() => { clearAiDraft(ownerId); clearDraftHistoryRequest(ownerId); setDraft(baseline); setMessage(t("Изменения отменены.", "Changes discarded.")); }}>{t("Отменить изменения", "Discard changes")}</Button> : null}<span role="status" className="text-xs text-muted-foreground">{message || (dirty ? t("Есть несохранённые изменения", "Unsaved changes") : t("Сохранено", "Saved"))}</span></div>
  </form>;
}

export function SettingsSearch({ locale }: { locale:SettingsLocale }) {
  const queryClient=useQueryClient();
  const t=(ru:string,en:string)=>locale==="en"?en:ru;
  const clear=useMutation({mutationFn:()=>api.delete<{success:true}>("/search/recent"),onSuccess:()=>Promise.all([queryClient.invalidateQueries({queryKey:["search"]}),queryClient.invalidateQueries({queryKey:["global-search","recent"]})])});
  return <section className={panelClass}><h2 className="font-semibold">{t("История поиска", "Search history")}</h2><p className="text-sm text-muted-foreground">{t("Недавние запросы доступны только в вашем аккаунте. Очистка истории не удаляет найденные документы.", "Recent queries belong to your account. Clearing history does not delete the matching documents.")}</p><Button variant="outline" loading={clear.isPending} onClick={()=>clear.mutate()}>{t("Очистить недавние запросы", "Clear recent searches")}</Button>{clear.isSuccess ? <p role="status" className="text-xs text-muted-foreground">{t("История очищена.", "History cleared.")}</p> : clear.isError ? <p role="alert" className="text-sm text-destructive">{t("Не удалось очистить историю.", "Could not clear search history.")}</p> : null}<Link className="block text-sm text-primary underline" href="/search">{t("Открыть поиск", "Open search")}</Link></section>;
}

export function SettingsExport({ locale, value, saving, onSave }: {locale:SettingsLocale;value:UserSettingsPayload;saving:boolean;onSave:(patch:Partial<UserSettingsPayload>)=>void}) {
  const t=(ru:string,en:string)=>locale==="en"?en:ru;
  return <section className={panelClass}><h2 className="font-semibold">{t("Экспорт", "Export")}</h2><label className="block max-w-sm space-y-1 text-sm"><span>{t("Формат возможностей по умолчанию", "Default opportunity export format")}</span><select className={selectClass} value={value.exportFormat} disabled={saving} onChange={event=>onSave({exportFormat:event.target.value as UserSettingsPayload["exportFormat"]})}><option value="csv">CSV</option><option value="xlsx">XLSX</option><option value="json">JSON</option></select></label><p className="text-sm text-muted-foreground">{t("Формат можно изменить перед выгрузкой. Список и фильтры выбираются в окне экспорта; личные данные доступны в рамках ваших прав.", "You can change the format before exporting. Choose records and filters in the export dialog; personal data follows your access permissions.")}</p><Link className="block text-sm text-primary underline" href="/opportunities">{t("Открыть возможности", "Open opportunities")}</Link></section>;
}
