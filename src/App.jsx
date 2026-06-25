import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";

const CLIENT_LOGO = "/koklu-logo.png";
const CLIENT_NAME = "Köklü Zeytincilik";
const PROVIDER_NAME = "Altıkod Digital Solutions";

const defaultZones = [
    { id: "production-a", name: "Üretim A", type: "Üretim", risk: "Yüksek" },
    { id: "production-b", name: "Üretim B", type: "Üretim", risk: "Yüksek" },
    { id: "packaging", name: "Paketleme", type: "Üretim", risk: "Orta" },
    { id: "warehouse", name: "Depo", type: "Lojistik", risk: "Orta" },
    { id: "lab", name: "Kalite Laboratuvarı", type: "Kalite", risk: "Yüksek" },
    { id: "office", name: "Ofis", type: "İdari", risk: "Düşük" },
];

const initialForm = {
    fullName: "",
    nationalIdLast4: "",
    company: "",
    phone: "",
    visitReason: "",
    hostPerson: "",
    plate: "",
    identityTaken: false,
    identityType: "T.C. Kimlik Kartı",
    visitorCardGiven: false,
    cardId: "",
    escortRequired: true,
    expectedExitTime: "17:30",
};

const initialRecords = [];

const defaultVisitorQuestions = [
    {
        key: "usesGlasses",
        textTr: "Gözlük kullanıyor musunuz?",
        textEn: "Do you wear glasses?",
        helperTr: "Üretim alanı için gözlük güvenlik uyumu yetkili tarafından kontrol edilir.",
        helperEn: "Glasses suitability for the production area will be checked by authorized staff.",
        riskyAnswer: null,
        riskNoteTr: "Gözlük kullanımı kayıt altına alınır.",
        riskNoteEn: "Glasses usage has been recorded.",
        active: true,
    },
    {
        key: "hasJewelry",
        textTr: "Üzerinizde takı, saat veya aksesuar var mı?",
        textEn: "Are you wearing jewelry, a watch or accessories?",
        helperTr: "Üretim alanına girmeden önce çıkarılması gerekir.",
        helperEn: "These items must be removed before entering the production area.",
        riskyAnswer: "yes",
        riskNoteTr: "Yetkili, üretim alanı öncesi aksesuarların çıkarıldığını kontrol etmelidir.",
        riskNoteEn: "Authorized staff must confirm that accessories are removed before entry.",
        active: true,
    },
    {
        key: "hasOpenWound",
        textTr: "Açık yara, kesik veya bandajlı bölgeniz var mı?",
        textEn: "Do you have an open wound, cut or bandaged area?",
        helperTr: "Gıda güvenliği açısından yetkili değerlendirmesi gerektirir.",
        helperEn: "This requires an authorized food-safety assessment.",
        riskyAnswer: "yes",
        riskNoteTr: "Açık yara beyan edildi. Alan seçimi öncesi kalite/hijyen sorumlusu bilgilendirilmeli.",
        riskNoteEn: "An open wound was declared. Quality or hygiene staff must be informed.",
        active: true,
    },
    {
        key: "hasSymptoms",
        textTr: "Ateş, öksürük, mide bulantısı, ishal veya bulaşıcı hastalık belirtiniz var mı?",
        textEn: "Do you have fever, cough, nausea, diarrhea or symptoms of an infectious disease?",
        helperTr: "Bu cevap risk değerlendirmesine girer.",
        helperEn: "This answer requires a risk assessment.",
        riskyAnswer: "yes",
        riskNoteTr: "Sağlık belirtisi beyan edildi. Ziyaret onayı yetkili değerlendirmesine bırakılmalı.",
        riskNoteEn: "Health symptoms were declared. Entry must be evaluated by authorized staff.",
        active: true,
    },
    {
        key: "willBringPersonalItem",
        textTr: "Üretim alanına kişisel eşya sokmanız gerekiyor mu?",
        textEn: "Do you need to bring personal belongings into the production area?",
        helperTr: "Telefon, çanta, yiyecek/içecek ve benzeri eşyalar ayrıca onaylanmalıdır.",
        helperEn: "Phones, bags, food, drinks and similar items require separate approval.",
        riskyAnswer: "yes",
        riskNoteTr: "Kişisel eşya talebi var. Yetkili izin verilmeyen eşyaları teslim almalı.",
        riskNoteEn: "Personal belongings were requested. Unauthorized items must be collected by staff.",
        active: true,
    },
];

const defaultConsentSections = {
    hygiene: {
        key: "hygiene",
        title: "Hijyen Beyanı",
        titleEn: "Hygiene Declaration",
        icon: "clipboard",
        items: [
            "Üzerimde gıda güvenliğini riske atabilecek yabancı madde bulunmadığını beyan ederim.",
            "Üretim alanına girmeden önce bone, galoş, önlük, maske gibi koruyucu ekipmanları kullanacağımı kabul ederim.",
            "Üretim alanına yiyecek, içecek, sigara, sakız veya kişisel eşya sokmayacağımı kabul ederim.",
        ],
        itemsEn: [
            "I declare that I do not carry any foreign material that could endanger food safety.",
            "I agree to use protective equipment such as a hairnet, shoe covers, gown and mask before entering production areas.",
            "I agree not to bring food, drinks, cigarettes, chewing gum or personal belongings into production areas.",
        ],
    },
    facility: {
        key: "facility",
        title: "Tesis Kuralları",
        titleEn: "Facility Rules",
        icon: "factory",
        items: [
            "Yetkilendirilmediğim alanlara girmeyeceğimi kabul ederim.",
            "Tesis içerisinde fotoğraf ve video çekmeyeceğimi kabul ederim.",
            "Güvenlik, hijyen ve kalite sorumlularının talimatlarına uyacağımı kabul ederim.",
            "Acil durum uyarılarında görevlilerin yönlendirmesine uyacağımı kabul ederim.",
        ],
        itemsEn: [
            "I agree not to enter areas for which I am not authorized.",
            "I agree not to take photos or videos inside the facility.",
            "I agree to follow instructions from security, hygiene and quality staff.",
            "I agree to follow staff guidance during emergencies.",
        ],
        warning: "Fotoğraf/video yasağı ve üretim alanı sınırları özellikle vurgulanmalıdır.",
        warningEn: "The photo/video ban and production-area boundaries must be observed.",
    },
    kvkk: {
        key: "kvkk",
        title: "KVKK ve Veri İşleme Onayı",
        titleEn: "Privacy and Data Processing Consent",
        icon: "shield",
        items: [
            "Kişisel verilerimin ziyaretçi kayıt süreci kapsamında işlenmesine ilişkin aydınlatma metnini okudum.",
            "Giriş kayıtlarımın denetim ve güvenlik amacıyla saklanacağını anladım.",
            "Gerekli hallerde imzalı formun yetkili birimler tarafından görüntülenebileceğini kabul ederim.",
        ],
        itemsEn: [
            "I have read the privacy notice concerning the processing of my personal data during visitor registration.",
            "I understand that my entry records will be retained for audit and security purposes.",
            "I agree that the signed form may be viewed by authorized departments when necessary.",
        ],
    },
};

const translations = {
    TR: {
        kioskFlow: "Tablet Kiosk Akışı",
        appTitle: `${CLIENT_NAME} Ziyaretçi Yönetim Sistemi`,
        appSubtitle: "Ziyaretçi beyanı, yetkili kimlik/kart kontrolü, alan seçimi ve çıkış takibi",
        visitorInfo: "Ziyaretçi Bilgileri",
        healthQuestions: "Sağlık Soruları",
        digitalSignature: "Dijital İmza",
        handoff: "Yetkiliye Teslim",
        identityCard: "Kimlik & Kart",
        zoneSelection: "Alan Seçimi",
        completed: "Tamamlandı",
        visitor: "Ziyaretçi",
        transition: "Geçiş",
        staff: "Yetkili",
        system: "Sistem",
        insideVisitors: "İçerideki Ziyaretçi",
        activeCards: "Aktif Kart",
        riskyDeclarations: "Riskli Beyan",
        ready: "Hazır",
        review: "Kontrol",
        visitorFlow: "Ziyaret Akışı",
        back: "Geri",
        continue: "Devam Et",
        completeRecord: "Kaydı Tamamla",
        staffContinue: "Yetkili Olarak Devam Et",
        newRecord: "Yeni Ziyaretçi Kaydı",
        yes: "Evet",
        no: "Hayır",
        infoDescription: "Lütfen giriş kaydı için bilgilerinizi doldurun. Kimlik ve kart işlemleri yetkili personel tarafından tamamlanacaktır.",
        questionsDescription: "Aşağıdaki sorular üretim alanı güvenliği için kayıt altına alınır.",
        requiredComplete: "Zorunlu bilgiler tamamlandı. Devam edebilirsiniz.",
        requiredMissing: "Devam etmek için yıldızlı alanları doldurun.",
        fullName: "Ad Soyad",
        company: "Firma",
        phone: "Telefon",
        visitReason: "Ziyaret Nedeni",
        hostPerson: "Görüşülecek Kişi",
        plate: "Araç Plakası",
        enter: "giriniz",
        adminLogin: "Admin Girişi",
        login: "Giriş",
        readConsent: "Metni okuyun, aşağı inin ve bölüm onayını verin.",
        readEnd: "Bu bölümün sonuna geldiğinizde onay kutusu aktifleşir.",
        readDone: "Metni okudum",
        consentAccept: "Bu bölümü okudum, anladım ve kabul ediyorum.",
        signatureDescription: "Beyan ve onaylarınızı tamamlamak için alana imzanızı atın.",
        clearSignature: "İmzayı Temizle",
        signatureTaken: "İmza Alındı",
        signatureWaiting: "İmza Bekleniyor",
        approvalSummary: "Onay Özeti",
        questions: "Sorular",
        approved: "Onaylandı",
        missing: "Eksik",
        handoffTitle: "Lütfen tableti ve kimliğinizi yetkili personele teslim ediniz",
        handoffDescription: "Ziyaretçi beyanı ve imzanız alınmıştır. Kimlik kontrolü, ziyaretçi kartı ve alan seçimi yetkili personel tarafından tamamlanacaktır.",
        staffStatus: "Yetkili Durumu",
        opened: "Açıldı",
        pinWaiting: "PIN Bekliyor",
        recordCompleted: "Ziyaretçi Kaydı Tamamlandı",
        recordCompletedDescription: "Beyan, imza, kimlik/kart zimmeti, alan seçimi ve QR doğrulama oluşturuldu.",
        downloadPdf: "PDF İndir",
        startNewRecord: "Yeni Kayıt Başlat",
    },
    EN: {
        kioskFlow: "Tablet Kiosk Flow",
        appTitle: `${CLIENT_NAME} Visitor Management System`,
        appSubtitle: "Visitor declaration, staff identity/card control, zone selection and exit tracking",
        visitorInfo: "Visitor Information",
        healthQuestions: "Health Questions",
        digitalSignature: "Digital Signature",
        handoff: "Hand Over to Staff",
        identityCard: "Identity & Card",
        zoneSelection: "Zone Selection",
        completed: "Completed",
        visitor: "Visitor",
        transition: "Handover",
        staff: "Staff",
        system: "System",
        insideVisitors: "Visitors Inside",
        activeCards: "Active Cards",
        riskyDeclarations: "Risk Declarations",
        ready: "Ready",
        review: "Review",
        visitorFlow: "Visitor Flow",
        back: "Back",
        continue: "Continue",
        completeRecord: "Complete Record",
        staffContinue: "Continue as Staff",
        newRecord: "New Visitor Record",
        yes: "Yes",
        no: "No",
        infoDescription: "Please enter your details. Identity and visitor card operations will be completed by authorized staff.",
        questionsDescription: "The following answers are recorded for production-area safety.",
        requiredComplete: "Required information is complete. You may continue.",
        requiredMissing: "Complete the required fields to continue.",
        fullName: "Full Name",
        company: "Company",
        phone: "Phone",
        visitReason: "Reason for Visit",
        hostPerson: "Person to Visit",
        plate: "Vehicle Plate",
        enter: "enter",
        adminLogin: "Admin Login",
        login: "Login",
        readConsent: "Read the text, scroll to the end and provide your consent.",
        readEnd: "The consent checkbox becomes active when you reach the end.",
        readDone: "I have read the text",
        consentAccept: "I have read, understood and accept this section.",
        signatureDescription: "Sign in the area below to complete your declarations and consents.",
        clearSignature: "Clear Signature",
        signatureTaken: "Signature Captured",
        signatureWaiting: "Waiting for Signature",
        approvalSummary: "Approval Summary",
        questions: "Questions",
        approved: "Approved",
        missing: "Missing",
        handoffTitle: "Please hand the tablet and your identity document to authorized staff",
        handoffDescription: "Your declaration and signature have been recorded. Identity control, visitor card assignment and zone selection will be completed by authorized staff.",
        staffStatus: "Staff Status",
        opened: "Unlocked",
        pinWaiting: "Waiting for PIN",
        recordCompleted: "Visitor Record Completed",
        recordCompletedDescription: "Declaration, signature, identity/card custody, zone selection and QR verification were created.",
        downloadPdf: "Download PDF",
        startNewRecord: "Start New Record",
    },
};

const translate = (lang, key) => translations[lang]?.[key] || translations.TR[key] || key;
const detectPreferredLanguage = () => {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    return languages.some((language) => language?.toLowerCase().startsWith("en")) ? "EN" : "TR";
};

const autoTranslateToEnglish = async (text) => {
    const cleanText = text?.trim();
    if (!cleanText) return "";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=en&dt=t&q=${encodeURIComponent(cleanText)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation service unavailable");
    const data = await response.json();
    return (data[0] || []).map((part) => part[0]).join("").trim();
};
const questionText = (question, lang) => lang === "EN" ? question.textEn || question.textTr : question.textTr;
const questionHelper = (question, lang) => lang === "EN" ? question.helperEn || question.helperTr : question.helperTr;
const questionRiskNote = (question, lang) => lang === "EN" ? question.riskNoteEn || question.riskNoteTr : question.riskNoteTr;

const normalizeQuestions = (questions) => questions.map((question) => ({
    key: question.key || `question_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    textTr: question.textTr || question.text || "",
    textEn: question.textEn || "",
    helperTr: question.helperTr || question.helper || "",
    helperEn: question.helperEn || "",
    riskyAnswer: question.riskyAnswer || null,
    riskNoteTr: question.riskNoteTr || question.noteForYes || "",
    riskNoteEn: question.riskNoteEn || "",
    active: question.active !== false,
}));

const apiRequest = async (path, options = {}) => {
    const response = await fetch(path, {
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.error || "Sunucu ile iletişim kurulamadı");
    }
    return payload;
};

const buildInitialMap = (items, value = false) =>
    items.reduce((current, item) => ({ ...current, [item.key]: value }), {});

const createRecordId = () => {
    const year = new Date().getFullYear();
    const randomPart = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12)
        || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return `ZYT-${year}-${randomPart.toUpperCase()}`;
};
const formatDateTime = () =>
    new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date());
const formatTime = () =>
    new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
const dateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const todayInput = () => dateInputValue();

const startOfWeekInput = () => {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return dateInputValue(date);
};

const startOfMonthInput = () => {
    const date = new Date();
    date.setDate(1);
    return dateInputValue(date);
};

const recordDateValue = (record) => {
    if (record.createdAtIso) return new Date(record.createdAtIso);
    if (record.createdAt) {
        const match = record.createdAt.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}T12:00:00`);
    }
    return null;
};

const filterRecordsByDate = (records, fromDate, toDate) => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    return records.filter((record) => {
        const date = recordDateValue(record);
        if (!date) return !from && !to;
        return (!from || date >= from) && (!to || date <= to);
    });
};

const excelCell = (value) => String(value ?? "").replaceAll("\t", " ").replace(/[\r\n]+/g, " ");

const encodeUtf16Le = (text) => {
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        bytes[2 + index * 2] = code & 0xff;
        bytes[3 + index * 2] = code >> 8;
    }
    return bytes;
};

const getZoneNames = (selectedZones = [], zones = []) =>
    selectedZones.map((id) => zones.find((zone) => zone.id === id)?.name).filter(Boolean).join(", ");

const recordsToCsv = (records, zones) => {
    const headers = ["Kayıt No", "Ad Soyad", "Firma", "Kart", "Giriş Saati", "Çıkış Saati", "Planlanan Çıkış", "Durum", "Alanlar", "Riskler"];
    const rows = records.map((record) => [
        record.id,
        record.name,
        record.company,
        record.cardId,
        record.time,
        record.exitTime || "",
        record.expectedExitTime,
        record.status,
        getZoneNames(record.selectedZones, zones),
        (record.riskFlags || []).join(" | "),
    ]);
    const excelText = [headers, ...rows].map((row) => row.map(excelCell).join("\t")).join("\r\n");
    return encodeUtf16Le(excelText);
};

const downloadFile = (fileName, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const htmlEscape = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

const openPrintableRecord = ({ form, recordId, nowText, signature, selectedZones, zones, answers, riskFlags, questions = defaultVisitorQuestions, lang = "TR" }) => {
    const answerRows = questions.map((question) => `
        <tr>
            <td>${htmlEscape(questionText(question, lang))}</td>
            <td><strong>${answers[question.key] === "yes" ? translate(lang, "yes") : answers[question.key] === "no" ? translate(lang, "no") : "-"}</strong></td>
        </tr>
    `).join("");
    const riskHtml = riskFlags.length
        ? `<section class="risk"><h2>Yetkili Dikkatine</h2><ul>${riskFlags.map((risk) => `<li>${htmlEscape(risk)}</li>`).join("")}</ul></section>`
        : "";
    const signatureHtml = signature
        ? `<img class="signature" src="${signature}" alt="İmza" />`
        : `<div class="signature-placeholder">İmza sistem kaydında</div>`;
    const printable = window.open("", "_blank", "width=900,height=1100");
    if (!printable) return;
    printable.document.write(`
        <!doctype html>
        <html lang="tr">
        <head>
            <meta charset="utf-8" />
            <title>${htmlEscape(recordId)} - Ziyaretçi Formu</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; padding: 32px; color: #0f172a; font-family: Arial, sans-serif; }
                header { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid #dbe3ed; padding-bottom: 18px; }
                .brand { display: flex; align-items: center; gap: 14px; }
                .brand img { width: 72px; height: 72px; border-radius: 999px; object-fit: cover; background: #063b31; }
                h1 { margin: 0; font-size: 24px; }
                h2 { margin: 0 0 12px; font-size: 16px; }
                .powered { margin-top: 6px; color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; }
                .record { border-radius: 14px; background: #f1f5f9; padding: 10px 14px; font-size: 13px; font-weight: 700; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
                .field, section { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
                .label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
                .value { margin-top: 5px; font-weight: 700; }
                table { width: 100%; border-collapse: collapse; }
                td { border-top: 1px solid #e2e8f0; padding: 10px 0; vertical-align: top; }
                section { margin-top: 18px; }
                .risk { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
                .signature { display: block; width: 100%; max-height: 110px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; }
                .signature-placeholder { height: 96px; border: 1px dashed #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #64748b; }
                @media print { body { padding: 18mm; } }
            </style>
        </head>
        <body>
            <header>
                <div class="brand">
                    <img src="${CLIENT_LOGO}" alt="${htmlEscape(CLIENT_NAME)} logosu" />
                    <div>
                        <h1>${htmlEscape(CLIENT_NAME)} Ziyaretçi Giriş ve Hijyen Beyan Formu</h1>
                        <div class="powered">Powered by ${htmlEscape(PROVIDER_NAME)}</div>
                    </div>
                </div>
                <div class="record">${htmlEscape(recordId)}</div>
            </header>
            <div class="grid">
                <div class="field"><div class="label">Ad Soyad</div><div class="value">${htmlEscape(form.fullName || "-")}</div></div>
                <div class="field"><div class="label">Firma</div><div class="value">${htmlEscape(form.company || "-")}</div></div>
                <div class="field"><div class="label">Telefon</div><div class="value">${htmlEscape(form.phone || "-")}</div></div>
                <div class="field"><div class="label">Ziyaret Nedeni</div><div class="value">${htmlEscape(form.visitReason || "-")}</div></div>
                <div class="field"><div class="label">Kart ID</div><div class="value">${htmlEscape(form.cardId || "-")}</div></div>
                <div class="field"><div class="label">Tarih/Saat</div><div class="value">${htmlEscape(nowText)}</div></div>
            </div>
            <section><h2>Beyan Soruları</h2><table>${answerRows}</table></section>
            <section><h2>Seçili Alanlar</h2>${htmlEscape(getZoneNames(selectedZones, zones) || "-")}</section>
            ${riskHtml}
            <section><h2>Dijital İmza</h2>${signatureHtml}</section>
            <script>window.addEventListener("load", () => { window.print(); });</script>
        </body>
        </html>
    `);
    printable.document.close();
};

function runSelfTests(consentSections, questions) {
    return [
        { name: "Ziyaretçi ve yetkili adımları ayrıldı", pass: true },
        { name: "Evet/Hayır beyan soruları tanımlı", pass: questions.some((question) => question.active) },
        { name: "Her onay bölümünde en az 1 madde olmalı", pass: Object.values(consentSections).every((section) => section.items.length >= 1) },
        { name: "Kart ID alanı tanımlı olmalı", pass: "cardId" in initialForm },
    ];
}

export default function VisitorHygieneCardSystem() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(initialForm);
    const [selectedZones, setSelectedZones] = useState(["office"]);
    const [records, setRecords] = useState(initialRecords);
    const [consentSections, setConsentSections] = useState(defaultConsentSections);
    const [zones, setZones] = useState(defaultZones);
    const [questions, setQuestions] = useState(() => normalizeQuestions(defaultVisitorQuestions));
    const [answers, setAnswers] = useState(() => buildInitialMap(normalizeQuestions(defaultVisitorQuestions), ""));
    const [consents, setConsents] = useState(() => buildInitialMap(Object.values(consentSections)));
    const [readCompleted, setReadCompleted] = useState(() => buildInitialMap(Object.values(consentSections)));
    const [signature, setSignature] = useState("");
    const [signatureTouched, setSignatureTouched] = useState(false);
    const [recordSubmitted, setRecordSubmitted] = useState(false);
    const [staffUnlocked, setStaffUnlocked] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [adminAuthenticated, setAdminAuthenticated] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [summary, setSummary] = useState({ inside_count: 0, active_card_count: 0, risk_count: 0 });
    const [toast, setToast] = useState("");
    const [lang, setLang] = useState(detectPreferredLanguage);
    const [backendState, setBackendState] = useState({ loading: true, error: "" });

    const consentList = useMemo(() => Object.values(consentSections), [consentSections]);
    const activeQuestions = useMemo(() => questions.filter((question) => question.active), [questions]);
    const t = (key) => translate(lang, key);
    const steps = [
        { label: t("visitorInfo"), owner: t("visitor") },
        { label: t("healthQuestions"), owner: t("visitor") },
        ...consentList.map((section) => ({ label: lang === "EN" ? section.titleEn || section.title : section.title, owner: t("visitor"), consentKey: section.key })),
        { label: t("digitalSignature"), owner: t("visitor") },
        { label: t("handoff"), owner: t("transition") },
        { label: t("identityCard"), owner: t("staff") },
        { label: t("zoneSelection"), owner: t("staff") },
        { label: t("completed"), owner: t("system") },
    ];

    const questionStep = 1;
    const firstConsentStep = 2;
    const signatureStep = firstConsentStep + consentList.length;
    const handoffStep = signatureStep + 1;
    const identityStep = handoffStep + 1;
    const zoneStep = handoffStep + 2;
    const doneStep = handoffStep + 3;

    const refreshSummary = useCallback(async () => {
        const data = await apiRequest("/api/bootstrap");
        if (data.storage !== "postgresql") {
            throw new Error("Uygulama merkezi veritabanı modunda çalışmıyor. Lütfen sayfayı yenileyin.");
        }
        setSummary(data.summary || { inside_count: 0, active_card_count: 0, risk_count: 0 });
        return data;
    }, []);

    const refreshAdminRecords = useCallback(async () => {
        const data = await apiRequest("/api/records");
        setRecords(data.records || []);
    }, []);

    useEffect(() => {
        let active = true;
        refreshSummary()
            .then((data) => {
                if (!active) return;
                if (data.settings?.consents) setConsentSections(data.settings.consents);
                if (data.settings?.zones) setZones(data.settings.zones);
                if (data.settings?.questions) setQuestions(normalizeQuestions(data.settings.questions));
                setBackendState({ loading: false, error: "" });
            })
            .catch((error) => {
                if (!active) return;
                setBackendState({ loading: false, error: error.message });
            });
        return () => { active = false; };
    }, [refreshSummary]);

    useEffect(() => {
        if (backendState.loading) return undefined;
        const interval = window.setInterval(() => {
            refreshSummary().catch(() => {});
        }, 10000);
        return () => window.clearInterval(interval);
    }, [backendState.loading, refreshSummary]);

    useEffect(() => {
        if (!adminAuthenticated || !showAdmin || backendState.loading) return undefined;
        const interval = window.setInterval(() => {
            refreshAdminRecords().catch(() => {});
        }, 6000);
        return () => window.clearInterval(interval);
    }, [adminAuthenticated, showAdmin, backendState.loading, refreshAdminRecords]);

    useEffect(() => {
        if (!adminAuthenticated || backendState.loading) return undefined;
        const timeout = window.setTimeout(() => {
            apiRequest("/api/settings/questions", { method: "PUT", body: JSON.stringify(questions) })
                .catch((error) => notify(error.message));
        }, 600);
        return () => window.clearTimeout(timeout);
    }, [questions, adminAuthenticated, backendState.loading]);

    useEffect(() => {
        if (!adminAuthenticated || backendState.loading) return undefined;
        const timeout = window.setTimeout(() => {
            apiRequest("/api/settings/consents", { method: "PUT", body: JSON.stringify(consentSections) })
                .catch((error) => notify(error.message));
        }, 600);
        return () => window.clearTimeout(timeout);
    }, [consentSections, adminAuthenticated, backendState.loading]);

    useEffect(() => {
        if (!adminAuthenticated || backendState.loading) return undefined;
        const timeout = window.setTimeout(() => {
            apiRequest("/api/settings/zones", { method: "PUT", body: JSON.stringify(zones) })
                .catch((error) => notify(error.message));
        }, 600);
        return () => window.clearTimeout(timeout);
    }, [zones, adminAuthenticated, backendState.loading]);

    useEffect(() => {
        setConsents((current) => ({ ...buildInitialMap(consentList), ...current }));
        setReadCompleted((current) => ({ ...buildInitialMap(consentList), ...current }));
    }, [consentList]);

    useEffect(() => {
        setAnswers((current) => ({ ...buildInitialMap(activeQuestions, ""), ...current }));
    }, [activeQuestions]);

    const tests = useMemo(() => runSelfTests(consentSections, questions), [consentSections, questions]);
    const allTestsPassed = tests.every((test) => test.pass);
    const [recordMeta, setRecordMeta] = useState(() => ({ id: createRecordId(), createdAt: formatDateTime(), createdAtIso: new Date().toISOString(), time: formatTime() }));

    const requiredFilled = [form.fullName, form.company, form.phone, form.visitReason, form.hostPerson].every((value) => value.trim().length > 1);
    const allQuestionsAnswered = activeQuestions.every((question) => answers[question.key] === "yes" || answers[question.key] === "no");
    const identityAndCardReady = form.identityTaken && form.visitorCardGiven && form.cardId.trim().length > 1;
    const zonesReady = selectedZones.length > 0;
    const isConsentStep = step >= firstConsentStep && step < signatureStep;
    const currentConsent = isConsentStep ? consentList[step - firstConsentStep] : null;
    const currentSectionKey = currentConsent?.key;
    const riskFlags = useMemo(
        () => activeQuestions
            .filter((question) => question.riskyAnswer && answers[question.key] === question.riskyAnswer)
            .map((question) => questionRiskNote(question, lang) || questionText(question, lang)),
        [activeQuestions, answers, lang],
    );

    const canContinue =
        step === 0 ? requiredFilled :
            step === questionStep ? allQuestionsAnswered :
                isConsentStep ? readCompleted[currentSectionKey] && consents[currentSectionKey] :
                    step === signatureStep ? signatureTouched :
                        step === handoffStep ? staffUnlocked :
                            step === identityStep ? identityAndCardReady :
                                step === zoneStep ? zonesReady : true;

    const progress = Math.round(((step + 1) / steps.length) * 100);

    const currentRecord = {
        id: recordMeta.id,
        name: form.fullName || "Yeni Ziyaretçi",
        company: form.company || "-",
        phone: form.phone || "-",
        visitReason: form.visitReason || "-",
        hostPerson: form.hostPerson || "-",
        plate: form.plate || "-",
        identityType: form.identityType,
        nationalIdLast4: form.nationalIdLast4,
        cardId: form.cardId || "-",
        status: "İçeride",
        time: recordMeta.time,
        createdAt: recordMeta.createdAt,
        createdAtIso: recordMeta.createdAtIso,
        expectedExitTime: form.expectedExitTime,
        identityTaken: form.identityTaken,
        visitorCardGiven: form.visitorCardGiven,
        selectedZones,
        answers,
        riskFlags,
        questionSnapshot: activeQuestions,
        consentSnapshot: consentList,
        signature,
        language: lang,
    };

    const notify = (message, duration = 3000) => {
        setToast(message);
        window.setTimeout(() => setToast(""), duration);
    };

    const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const updateAnswer = (key, value) => setAnswers((current) => ({ ...current, [key]: value }));
    const markRead = (key) => setReadCompleted((current) => ({ ...current, [key]: true }));
    const toggleConsent = (key) => setConsents((current) => ({ ...current, [key]: !current[key] }));
    const toggleZone = (zoneId) => setSelectedZones((current) => current.includes(zoneId) ? current.filter((id) => id !== zoneId) : [...current, zoneId]);

    const checkBlacklist = () => {
        const query = `${form.fullName} ${form.nationalIdLast4} ${form.company}`.toLowerCase();
        return ["9999", "Ahmet Yılmaz", "Rakip Firma"].some((item) => query.includes(item.toLowerCase()));
    };

    const next = async () => {
        if (step === 0 && checkBlacklist()) {
            notify("KARA LİSTE UYARISI: Bu bilgi ile tesise giriş engellenmiştir. Lütfen güvenlik departmanı ile görüşün.");
            return;
        }
        if (!canContinue) {
            notify(step === handoffStep ? "Devam için yetkili personel PIN girmelidir." : "Devam etmek için bu adımın zorunlu alanlarını tamamlayın.");
            return;
        }
        if (step === zoneStep && !recordSubmitted) {
            try {
                const result = await apiRequest("/api/records", { method: "POST", body: JSON.stringify(currentRecord) });
                if (!result?.persisted || !result.record?.id) {
                    throw new Error("Kayıt veritabanında doğrulanamadı. Lütfen tekrar deneyin.");
                }
                if (result.record.id !== currentRecord.id) {
                    setRecordMeta((current) => ({ ...current, id: result.record.id }));
                }
                setRecordSubmitted(true);
                setSummary((current) => ({
                    inside_count: current.inside_count + 1,
                    active_card_count: current.active_card_count + (currentRecord.visitorCardGiven ? 1 : 0),
                    risk_count: current.risk_count + (currentRecord.riskFlags.length > 0 ? 1 : 0),
                }));
            } catch (error) {
                notify(`KAYIT HATASI: ${error.message} - Lütfen yetkiliye haber verin.`, 8000);
                return;
            }
        }
        setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
    };

    const prev = () => {
        if (step === handoffStep) return;
        setStep((currentStep) => Math.max(currentStep - 1, 0));
    };

    const restart = () => {
        setStep(0);
        setForm(initialForm);
        setSelectedZones(["office"]);
        setAnswers(buildInitialMap(activeQuestions, ""));
        setConsents(buildInitialMap(consentList));
        setReadCompleted(buildInitialMap(consentList));
        setSignature("");
        setSignatureTouched(false);
        setRecordSubmitted(false);
        setStaffUnlocked(false);
        setRecordMeta({ id: createRecordId(), createdAt: formatDateTime(), createdAtIso: new Date().toISOString(), time: formatTime() });
    };

    const exportCsv = (recordsToExport = records, fileSuffix = todayInput()) => {
        downloadFile(`ziyaretci-raporu-${fileSuffix}.csv`, recordsToCsv(recordsToExport, zones), "application/vnd.ms-excel;charset=utf-16le");
        notify("Günlük rapor CSV olarak indirildi.");
    };

    const exitVisitor = async (record) => {
        try {
            const exitTime = formatTime();
            const data = await apiRequest(`/api/records/${encodeURIComponent(record.id)}/exit`, {
                method: "PATCH",
                body: JSON.stringify({ exitTime }),
            });
            setRecords((current) => current.map((item) => item.id === record.id ? data.record : item));
            setSummary((current) => ({
                ...current,
                inside_count: Math.max(0, current.inside_count - 1),
                active_card_count: Math.max(0, current.active_card_count - (record.visitorCardGiven ? 1 : 0)),
            }));
            notify("Çıkış tamamlandı: Kimlik iade edildi, ziyaretçi kartı teslim alındı.");
        } catch (error) {
            notify(error.message);
        }
    };

    const verifyPin = async (pin) => {
        await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ pin }) });
    };

    const handleAdminLogin = async (pin) => {
        try {
            await verifyPin(pin);
            await refreshAdminRecords();
            setAdminAuthenticated(true);
            setShowAdmin(true);
            notify("Admin girişi başarılı.");
        } catch (error) {
            notify(error.message);
        }
    };

    const handleStaffUnlock = async (pin) => {
        try {
            await verifyPin(pin);
            setStaffUnlocked(true);
            notify("Yetkili ekranı açıldı.");
        } catch (error) {
            notify(error.message);
        }
    };

    const logOutAdmin = async () => {
        await apiRequest("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
        setShowAdmin(false);
        setAdminAuthenticated(false);
        setRecords([]);
        setSelectedRecord(null);
    };

    if (backendState.loading) {
        return <SystemState title="Sistem hazırlanıyor" description="Sunucu ve veritabanı bağlantısı kontrol ediliyor." />;
    }

    if (backendState.error) {
        return <SystemState title="Sunucu bağlantısı kurulamadı" description={backendState.error} error />;
    }

    return (
        <div className={`min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6 ${!showAdmin ? "kiosk-shell" : ""}`}>
            <div className={`mx-auto max-w-7xl ${!showAdmin ? "kiosk-container" : ""}`}>
                {toast && <div className="fixed right-5 top-5 z-50 rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}

                <header className="kiosk-header mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <BrandLogo size="lg" />
                        <div>
                            <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t("kioskFlow")}</div>
                            <h1 className="text-3xl font-bold tracking-tight">{t("appTitle")}</h1>
                            <p className="mt-1 text-slate-600">{t("appSubtitle")}</p>
                            <PoweredBy className="mt-3" />
                        </div>
                    </div>
                    {!showAdmin && (
                        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Dil seçimi">
                            {["TR", "EN"].map((language) => (
                                <button
                                    key={language}
                                    type="button"
                                    onClick={() => setLang(language)}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${lang === language ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                                    aria-pressed={lang === language}
                                >
                                    {language}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {!showAdmin && (
                    <div className="kiosk-status mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <StatusCard title={t("insideVisitors")} value={String(summary.inside_count)} icon="user" />
                        <StatusCard title={t("activeCards")} value={String(summary.active_card_count)} icon="card" />
                        <StatusCard title={t("riskyDeclarations")} value={String(summary.risk_count)} icon="warning" />
                        <StatusCard title={t("system")} value={allTestsPassed ? t("ready") : t("review")} icon="shield" />
                    </div>
                )}

                {showAdmin ? (
                    <AdminPanel
                        records={records}
                        exportCsv={exportCsv}
                        tests={tests}
                        selectedRecord={selectedRecord}
                        setSelectedRecord={setSelectedRecord}
                        exitVisitor={exitVisitor}
                        onLogOut={logOutAdmin}
                        consentSections={consentSections}
                        setConsentSections={setConsentSections}
                        zones={zones}
                        questions={questions}
                        setQuestions={setQuestions}
                    />
                ) : (
                    <div className="kiosk-workspace grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr_340px]">
                        <Panel className="kiosk-flow flex flex-col justify-between p-5">
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-slate-500">{t("visitorFlow")}</h2>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">%{progress}</span>
                                </div>
                                <div className="mb-5 h-2 rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="kiosk-steps space-y-3">
                                    {steps.map((item, index) => (
                                        <button
                                            key={`${item.label}-${index}`}
                                            type="button"
                                            onClick={() => index < handoffStep && index <= step && setStep(index)}
                                            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${step === index
                                                ? "bg-slate-900 text-white"
                                                : index < step
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-50 text-slate-500"
                                                }`}
                                        >
                                            {index < step ? <Icon name="check" size={18} /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs">{index + 1}</span>}
                                            <span className="min-w-0">
                                                <span className="block truncate">{item.label}</span>
                                                <span className="block text-[11px] opacity-70">{item.owner}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-8 border-t pt-4">
                                <AdminLogin onLogin={handleAdminLogin} lang={lang} />
                            </div>
                        </Panel>

                        <Panel className="kiosk-main min-h-[690px] p-6 md:p-8">
                            {step === 0 && <VisitorInfo form={form} updateField={updateField} requiredFilled={requiredFilled} lang={lang} />}
                            {step === questionStep && <QuestionStep questions={activeQuestions} answers={answers} updateAnswer={updateAnswer} riskFlags={riskFlags} lang={lang} />}
                            {isConsentStep && currentConsent && (
                                <ConsentBlock
                                    section={currentConsent}
                                    readCompleted={readCompleted[currentSectionKey]}
                                    consent={consents[currentSectionKey]}
                                    markRead={markRead}
                                    toggleConsent={toggleConsent}
                                    lang={lang}
                                />
                            )}
                            {step === signatureStep && <SignatureStep signature={signature} setSignature={setSignature} signatureTouched={signatureTouched} setSignatureTouched={setSignatureTouched} form={form} consents={consents} answers={answers} questions={activeQuestions} lang={lang} />}
                            {step === handoffStep && <HandoffStep form={form} riskFlags={riskFlags} staffUnlocked={staffUnlocked} onUnlock={handleStaffUnlock} lang={lang} />}
                            {step === identityStep && <IdentityCardStep form={form} updateField={updateField} ready={identityAndCardReady} riskFlags={riskFlags} />}
                            {step === zoneStep && <ZoneSelectionStep zones={zones} selectedZones={selectedZones} toggleZone={toggleZone} escortRequired={form.escortRequired} updateField={updateField} riskFlags={riskFlags} />}
                            {step === doneStep && <DoneStep form={form} recordId={recordMeta.id} nowText={recordMeta.createdAt} signature={signature} restart={restart} selectedZones={selectedZones} zones={zones} answers={answers} riskFlags={riskFlags} questions={activeQuestions} lang={lang} />}

                            <div className="mt-8 flex justify-between border-t pt-6">
                                <button type="button" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={prev} disabled={step === 0 || step === handoffStep}>
                                    <Icon name="arrowLeft" size={18} className="mr-2" /> {t("back")}
                                </button>
                                {step < doneStep ? (
                                    <button type="button" className={`inline-flex items-center rounded-2xl px-6 py-3 font-medium text-white ${canContinue ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-400"}`} onClick={next}>
                                        {step === handoffStep ? t("staffContinue") : step >= identityStep ? t("completeRecord") : t("continue")} <Icon name="arrowRight" size={18} className="ml-2" />
                                    </button>
                                ) : (
                                    <button type="button" className="rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800" onClick={restart}>{t("newRecord")}</button>
                                )}
                            </div>
                        </Panel>

                        <LivePreview form={form} answers={answers} questions={activeQuestions} signatureTouched={signatureTouched} recordId={recordMeta.id} nowText={recordMeta.createdAt} selectedZones={selectedZones} zones={zones} riskFlags={riskFlags} staffUnlocked={staffUnlocked} />
                    </div>
                )}
            </div>
        </div>
    );
}

function VisitorInfo({ form, updateField, requiredFilled, lang }) {
    const t = (key) => translate(lang, key);
    const fields = [
        { key: "fullName", label: t("fullName"), required: true },
        { key: "company", label: t("company"), required: true },
        { key: "phone", label: t("phone"), required: true },
        { key: "visitReason", label: t("visitReason"), required: true },
        { key: "hostPerson", label: t("hostPerson"), required: true },
        { key: "plate", label: t("plate"), required: false },
    ];
    return (
        <div>
            <SectionHeader icon="user" title={t("visitorInfo")} description={t("infoDescription")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map((field) => (
                    <label key={field.key} className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-600">{field.label} {field.required && <b className="text-red-500">*</b>}</span>
                        <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-700 outline-none focus:border-slate-500" placeholder={`${field.label} ${t("enter")}`} value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} />
                    </label>
                ))}
            </div>
            <div className={`mt-6 rounded-2xl p-4 text-sm ${requiredFilled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                {requiredFilled ? t("requiredComplete") : t("requiredMissing")}
            </div>
        </div>
    );
}

function QuestionStep({ questions, answers, updateAnswer, riskFlags, lang }) {
    const t = (key) => translate(lang, key);
    return (
        <div>
            <SectionHeader icon="clipboard" title={t("healthQuestions")} description={t("questionsDescription")} />
            <div className="space-y-4">
                {questions.map((question) => (
                    <div key={question.key} className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900">{questionText(question, lang)}</h3>
                                <p className="mt-1 text-sm text-slate-500">{questionHelper(question, lang)}</p>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-2 md:w-56">
                                <button type="button" onClick={() => updateAnswer(question.key, "yes")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${answers[question.key] === "yes" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{t("yes")}</button>
                                <button type="button" onClick={() => updateAnswer(question.key, "no")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${answers[question.key] === "no" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{t("no")}</button>
                            </div>
                        </div>
                        {answers[question.key] === "yes" && questionRiskNote(question, lang) && (
                            <div className={`mt-4 rounded-2xl p-3 text-sm ${question.riskyAnswer === "yes" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{questionRiskNote(question, lang)}</div>
                        )}
                    </div>
                ))}
            </div>
            {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mt-5" />}
        </div>
    );
}

function ConsentBlock({ section, readCompleted, consent, markRead, toggleConsent, lang }) {
    const t = (key) => translate(lang, key);
    const title = lang === "EN" ? section.titleEn || section.title : section.title;
    const items = lang === "EN" ? section.itemsEn || section.items : section.items;
    const warning = lang === "EN" ? section.warningEn || section.warning : section.warning;
    return (
        <div>
            <SectionHeader icon={section.icon} title={title} description={t("readConsent")} />
            <div className="max-h-[330px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5" onScroll={(event) => { const el = event.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) markRead(section.key); }}>
                <div className="space-y-4">
                    {items.map((item, index) => <div key={index} className="flex gap-3 rounded-2xl bg-slate-50 p-4"><Icon name="check" size={20} className="mt-0.5 text-emerald-600" /><p className="text-slate-700">{item}</p></div>)}
                </div>
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{t("readEnd")}</div>
            </div>
            {!readCompleted && <button type="button" onClick={() => markRead(section.key)} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">{t("readDone")}</button>}
            {warning && <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><Icon name="cameraOff" size={20} /><span>{warning}</span></div>}
            <label className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${readCompleted ? "cursor-pointer border-slate-200 bg-slate-50" : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"}`}>
                <input type="checkbox" disabled={!readCompleted} checked={Boolean(consent)} onChange={() => toggleConsent(section.key)} className="h-6 w-6 rounded-md accent-slate-900" />
                <span className="font-medium">{t("consentAccept")}</span>
            </label>
        </div>
    );
}

function SignatureStep({ signature, setSignature, signatureTouched, setSignatureTouched, form, consents, answers, questions, lang }) {
    const t = (key) => translate(lang, key);
    const canvasRef = useRef(null);
    const drawingRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#0f172a";
    }, []);

    const getPoint = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const touch = event.touches?.[0];
        const clientX = touch ? touch.clientX : event.clientX;
        const clientY = touch ? touch.clientY : event.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (event) => {
        event.preventDefault();
        const ctx = canvasRef.current.getContext("2d");
        const point = getPoint(event);
        drawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
    };

    const draw = (event) => {
        if (!drawingRef.current) return;
        event.preventDefault();
        const ctx = canvasRef.current.getContext("2d");
        const point = getPoint(event);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setSignatureTouched(true);
    };

    const stopDrawing = () => { 
        if (drawingRef.current) {
            // Compress image to avoid hitting reverse proxy payload size limits
            setSignature(canvasRef.current.toDataURL("image/jpeg", 0.6));
        }
        drawingRef.current = false; 
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        setSignature("");
        setSignatureTouched(false);
    };

    return (
        <div>
            <SectionHeader icon="pen" title={t("digitalSignature")} description={t("signatureDescription")} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                <div>
                    <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="h-72 w-full touch-none rounded-3xl border-2 border-dashed border-slate-300 bg-white" />
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <button type="button" onClick={clearSignature} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700">{t("clearSignature")}</button>
                        <button type="button" className={`rounded-2xl px-5 py-3 font-medium text-white ${signatureTouched ? "bg-emerald-600" : "bg-slate-400"}`}>{signatureTouched ? t("signatureTaken") : t("signatureWaiting")}</button>
                    </div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 text-sm">
                    <h3 className="mb-3 font-bold">{t("approvalSummary")}</h3>
                    <SummaryLine label={t("visitor")} value={form.fullName || "-"} />
                    <SummaryLine label={t("company")} value={form.company || "-"} />
                    <SummaryLine label={t("questions")} value={`${Object.values(answers).filter(Boolean).length}/${questions.length}`} />
                    <SummaryLine label="Hijyen" value={consents.hygiene ? t("approved") : t("missing")} />
                    <SummaryLine label="Tesis" value={consents.facility ? t("approved") : t("missing")} />
                    <SummaryLine label="KVKK" value={consents.kvkk ? t("approved") : t("missing")} />
                    {signature && <img src={signature} alt="İmza" className="mt-4 h-20 w-full rounded-2xl border bg-white object-contain" />}
                </div>
            </div>
        </div>
    );
}

function HandoffStep({ form, riskFlags, staffUnlocked, onUnlock, lang }) {
    const t = (key) => translate(lang, key);
    return (
        <div>
            <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-5 w-fit rounded-full bg-blue-100 p-5 text-blue-700"><Icon name="lock" size={56} /></div>
                <h2 className="text-3xl font-bold">{t("handoffTitle")}</h2>
                <p className="mt-3 text-slate-600">{t("handoffDescription")}</p>
            </div>
            <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-slate-50 p-5">
                <SummaryLine label={t("visitor")} value={form.fullName || "-"} />
                <SummaryLine label={t("company")} value={form.company || "-"} />
                <SummaryLine label={t("staffStatus")} value={staffUnlocked ? t("opened") : t("pinWaiting")} />
                {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mt-4" />}
            </div>
            <div className="mx-auto mt-6 max-w-xl">
                <StaffUnlock onUnlock={onUnlock} unlocked={staffUnlocked} />
            </div>
        </div>
    );
}

function IdentityCardStep({ form, updateField, ready, riskFlags }) {
    return (
        <div>
            <SectionHeader icon="card" title="Yetkili Kimlik ve Kart Kontrolü" description="Bu ekran ziyaretçi tarafından değil, yetkili personel tarafından doldurulur." />
            {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mb-5" />}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kimlik Türü</span>
                    <select value={form.identityType} onChange={(e) => updateField("identityType", e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-500">
                        <option>T.C. Kimlik Kartı</option>
                        <option>Pasaport</option>
                        <option>Sürücü Belgesi</option>
                    </select>
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kimlik Son 4 Hane</span>
                    <input value={form.nationalIdLast4} onChange={(e) => updateField("nationalIdLast4", e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-500" placeholder="1234" />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Ziyaretçi Kart ID</span>
                    <input value={form.cardId} onChange={(e) => updateField("cardId", e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-500" placeholder="VK-045" />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Planlanan Çıkış</span>
                    <input type="time" step="300" value={form.expectedExitTime} onChange={(e) => updateField("expectedExitTime", e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-slate-500" />
                </label>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <CheckTile title="Kimlik Alındı" active={form.identityTaken} onClick={() => updateField("identityTaken", !form.identityTaken)} />
                <CheckTile title="Kart Verildi" active={form.visitorCardGiven} onClick={() => updateField("visitorCardGiven", !form.visitorCardGiven)} />
                <CheckTile title="Refakat Gerekli" active={form.escortRequired} onClick={() => updateField("escortRequired", !form.escortRequired)} />
            </div>
            <div className={`mt-6 rounded-2xl p-4 text-sm ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                {ready ? "Kimlik/kart zimmeti tamamlandı. Alan seçimine geçebilirsiniz." : "Devam etmek için kimlik alındı, kart verildi ve kart ID girildi olmalı."}
            </div>
        </div>
    );
}

function ZoneSelectionStep({ zones, selectedZones, toggleZone, escortRequired, updateField, riskFlags }) {
    return (
        <div>
            <SectionHeader icon="lock" title="Yetkili Alan Seçimi" description="Ziyaretçinin gireceği alanlar yetkili personel tarafından seçilir." />
            {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mb-5" />}
            <div className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                Yüksek riskli alanlarda refakat ve hijyen ekipmanı kontrolü önerilir. Bu ekran fiziksel kapı açma/kapatma yapmaz.
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {zones.map((zone) => {
                    const active = selectedZones.includes(zone.id);
                    return (
                        <button key={zone.id} type="button" onClick={() => toggleZone(zone.id)} className={`rounded-3xl border p-5 text-left transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                            <div className="flex items-center justify-between"><b>{zone.name}</b>{active && <Icon name="check" size={20} />}</div>
                            <p className={`mt-2 text-sm ${active ? "text-slate-200" : "text-slate-500"}`}>{zone.type} · Risk: {zone.risk}</p>
                        </button>
                    );
                })}
            </div>
            <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="checkbox" checked={escortRequired} onChange={() => updateField("escortRequired", !escortRequired)} className="h-5 w-5 accent-slate-900" />
                <span>Yüksek riskli alanlarda refakat zorunlu olsun.</span>
            </label>
        </div>
    );
}

function DoneStep({ form, recordId, nowText, signature, restart, selectedZones, zones, answers, riskFlags, questions, lang }) {
    const t = (key) => translate(lang, key);
    return (
        <div>
            <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-sm">
                    <BrandLogo />
                    <div className="text-left">
                        <p className="text-sm font-bold">{CLIENT_NAME}</p>
                        <PoweredBy />
                    </div>
                </div>
                <div className="mx-auto mb-5 w-fit rounded-full bg-emerald-100 p-5 text-emerald-700"><Icon name="check" size={56} /></div>
                <h2 className="text-3xl font-bold">{t("recordCompleted")}</h2>
                <p className="mt-3 text-slate-600">{t("recordCompletedDescription")}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(560px,1fr)_260px]">
                <PdfPreview form={form} recordId={recordId} nowText={nowText} signature={signature} selectedZones={selectedZones} zones={zones} answers={answers} riskFlags={riskFlags} questions={questions} lang={lang} />
                <div className="space-y-4">
                    <FakeQr recordId={recordId} />
                    <button
                        className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
                        onClick={() => openPrintableRecord({ form, recordId, nowText, signature, selectedZones, zones, answers, riskFlags, questions, lang })}
                    >
                        {t("downloadPdf")}
                    </button>
                    <button className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium" onClick={restart}>{t("startNewRecord")}</button>
                </div>
            </div>
        </div>
    );
}

function AdminLogin({ onLogin, lang = "TR" }) {
    const [pin, setPin] = useState("");
    return (
        <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-500">{translate(lang, "adminLogin")}</h3>
            <form
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void onLogin(pin);
                    setPin("");
                }}
            >
                <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN"
                    autoComplete="current-password"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
                />
                <button type="submit" className="rounded-xl bg-slate-900 px-4 text-sm font-medium text-white">
                    {translate(lang, "login")}
                </button>
            </form>
        </div>
    );
}

function StaffUnlock({ onUnlock, unlocked }) {
    const [pin, setPin] = useState("");
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold">Yetkili Personel Girişi</h3>
            <p className="mt-1 text-sm text-slate-500">Kimlik ve kart işlemlerine geçmek için personel PIN'i girin.</p>
            <div className="mt-4 flex gap-2">
                <input type="password" value={pin} disabled={unlocked} onChange={(e) => setPin(e.target.value)} placeholder="Yetkili PIN" className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-slate-500 disabled:bg-slate-100" />
                <button type="button" disabled={unlocked} onClick={() => { onUnlock(pin); setPin(""); }} className="rounded-2xl bg-slate-900 px-5 font-bold text-white disabled:bg-emerald-600">{unlocked ? "Açıldı" : "Onayla"}</button>
            </div>
        </div>
    );
}

function AdminPanel({ records, exportCsv, tests, selectedRecord, setSelectedRecord, exitVisitor, onLogOut, consentSections, setConsentSections, zones, questions, setQuestions }) {
    const [tab, setTab] = useState("dashboard");
    const [consentTranslationMessage, setConsentTranslationMessage] = useState("");
    const insideRecords = records.filter((record) => record.status === "İçeride");
    const exitedRecords = records.filter((record) => record.status === "Çıkış Yaptı");
    const pendingRecords = records.filter((record) => record.status === "Beklemede");
    const riskRecords = records.filter((record) => record.riskFlags?.length);

    const updateConsentItem = (sectionKey, index, value) => {
        setConsentSections((prev) => {
            const next = { ...prev, [sectionKey]: { ...prev[sectionKey], items: [...prev[sectionKey].items] } };
            next[sectionKey].items[index] = value;
            return next;
        });
    };

    const addConsentItem = (sectionKey) => {
        setConsentSections((prev) => ({
            ...prev,
            [sectionKey]: {
                ...prev[sectionKey],
                items: [...prev[sectionKey].items, ""],
                itemsEn: [...(prev[sectionKey].itemsEn || []), ""],
            },
        }));
    };

    const removeConsentItem = (sectionKey, index) => {
        setConsentSections((prev) => ({
            ...prev,
            [sectionKey]: {
                ...prev[sectionKey],
                items: prev[sectionKey].items.filter((_, i) => i !== index),
                itemsEn: (prev[sectionKey].itemsEn || []).filter((_, i) => i !== index),
            },
        }));
    };

    const addNewSection = () => {
        const key = `custom_${Date.now()}`;
        setConsentSections((prev) => ({
            ...prev,
            [key]: {
                key,
                title: "Yeni Onay Grubu",
                titleEn: "New Consent Group",
                icon: "clipboard",
                items: ["Buraya yeni kuralınızı yazın."],
                itemsEn: ["Enter your new rule here."],
            },
        }));
    };

    const removeSection = (sectionKey) => {
        if (Object.keys(consentSections).length <= 1) {
            alert("En az bir onay grubu bulunmalıdır!");
            return;
        }
        if (window.confirm("Bu onay grubunu silmek istediğinize emin misiniz?")) {
            setConsentSections((prev) => {
                const next = { ...prev };
                delete next[sectionKey];
                return next;
            });
        }
    };

    const updateSectionTitle = (sectionKey, title) => {
        setConsentSections((prev) => ({
            ...prev,
            [sectionKey]: { ...prev[sectionKey], title },
        }));
    };

    const translateConsentSection = async (sectionKey) => {
        const section = consentSections[sectionKey];
        if (!section) return;
        setConsentTranslationMessage("Onay metni otomatik çevriliyor...");
        try {
            const [titleEn, itemsEn, warningEn] = await Promise.all([
                autoTranslateToEnglish(section.title),
                Promise.all(section.items.map((item) => autoTranslateToEnglish(item))),
                autoTranslateToEnglish(section.warning || ""),
            ]);
            setConsentSections((current) => ({
                ...current,
                [sectionKey]: {
                    ...current[sectionKey],
                    titleEn,
                    itemsEn,
                    warningEn,
                },
            }));
            setConsentTranslationMessage("Onay metninin İngilizce çevirisi güncellendi.");
        } catch {
            setConsentTranslationMessage("Otomatik çeviri servisine ulaşılamadı. Mevcut çeviri korundu.");
        } finally {
            window.setTimeout(() => setConsentTranslationMessage(""), 3000);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            <Panel className="p-6">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Admin Paneli</h2>
                        <p className="text-slate-600">Ziyaretçi, kimlik, kart, çıkış ve PDF yönetimi</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTab("dashboard")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === "dashboard" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>Gösterge Paneli</button>
                        <button onClick={() => setTab("daily")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === "daily" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>Günlük Rapor</button>
                        <button onClick={() => setTab("questions")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === "questions" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>Soru Yönetimi</button>
                        <button onClick={() => setTab("settings")} className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === "settings" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>Metin Ayarları</button>
                        <button onClick={onLogOut} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Çık</button>
                    </div>
                </div>

                {tab === "dashboard" && (
                    <div className="overflow-x-auto rounded-3xl border border-slate-200">
                        <table className="w-full min-w-[940px] text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="p-4">Kayıt</th><th>Ad</th><th>Firma</th><th>Kart</th><th>Beklenen Çıkış</th><th>Risk</th><th>Durum</th><th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => {
                                    let isOverstay = false;
                                    if (record.status === "İçeride" && record.expectedExitTime) {
                                        const now = new Date();
                                        const currentMins = now.getHours() * 60 + now.getMinutes();
                                        const [eh, em] = record.expectedExitTime.split(":").map(Number);
                                        const expectedMins = eh * 60 + em;
                                        if (currentMins > expectedMins) isOverstay = true;
                                    }
                                    const hasRisk = isOverstay || record.riskFlags?.length > 0;
                                    return (
                                        <tr key={record.id} className={`border-t border-slate-200 ${hasRisk ? "bg-red-50" : ""}`}>
                                            <td className="p-4 font-medium">{record.id}</td>
                                            <td>{record.name}</td>
                                            <td>{record.company}</td>
                                            <td>{record.cardId}</td>
                                            <td className={isOverstay ? "font-bold text-red-600" : ""}>{record.expectedExitTime || "-"}</td>
                                            <td>{hasRisk ? <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white">UYARI</span> : "-"}</td>
                                            <td><span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.status === "İçeride" ? "bg-emerald-50 text-emerald-700" : record.status === "Çıkış Yaptı" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{record.status}</span></td>
                                            <td className="space-x-2">
                                                <button onClick={() => setSelectedRecord(record)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Önizle</button>
                                                {record.status === "İçeride" && <button onClick={() => exitVisitor(record)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Çıkış Yap</button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === "daily" && (
                    <DailyReport
                        records={records}
                        insideRecords={insideRecords}
                        exitedRecords={exitedRecords}
                        pendingRecords={pendingRecords}
                        riskRecords={riskRecords}
                        zones={zones}
                        setSelectedRecord={setSelectedRecord}
                        exportCsv={exportCsv}
                    />
                )}

                {tab === "questions" && (
                    <QuestionManager questions={questions} setQuestions={setQuestions} />
                )}

                {tab === "settings" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                            <div>
                                <h3 className="font-bold text-emerald-800">Onay Grupları Yönetimi</h3>
                                <p className="text-sm text-emerald-600">Metinleri Türkçe girin. İngilizce karşılıkları otomatik oluşturulur.</p>
                            </div>
                            <button onClick={addNewSection} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">+ Yeni Grup Ekle</button>
                        </div>
                        {consentTranslationMessage && <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{consentTranslationMessage}</div>}

                        {Object.values(consentSections).map((section) => (
                            <div key={section.key} className="relative rounded-2xl border border-slate-200 p-4 pt-5">
                                <button onClick={() => removeSection(section.key)} className="absolute -right-3 -top-3 rounded-full bg-red-100 p-1.5 text-red-600 shadow-sm transition-colors hover:bg-red-600 hover:text-white" title="Grubu Sil">
                                    <Icon name="warning" size={16} />
                                </button>
                                <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                                        <Icon name={section.icon} size={20} />
                                    </div>
                                    <input type="text" className="w-full bg-transparent text-lg font-bold outline-none focus:border-b focus:border-emerald-500" value={section.title} onChange={(e) => updateSectionTitle(section.key, e.target.value)} onBlur={() => translateConsentSection(section.key)} placeholder="Grup Başlığı" />
                                </div>

                                <div className="space-y-3">
                                    {section.items.map((item, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></div>
                                            <textarea className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500" rows="2" value={item} onChange={(e) => updateConsentItem(section.key, index, e.target.value)} onBlur={() => translateConsentSection(section.key)} />
                                            <button onClick={() => removeConsentItem(section.key, index)} className="p-2 text-slate-400 hover:text-red-500" title="Maddeyi Sil">
                                                <Icon name="warning" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addConsentItem(section.key)} className="pl-4 text-sm font-medium text-emerald-600 hover:text-emerald-700">+ Yeni Madde Ekle</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
            <Panel className="p-6">
                <h3 className="text-lg font-bold">Sistem Kontrolleri</h3>
                <div className="mt-4 space-y-3">
                    {tests.map((test) => <div key={test.name} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><Icon name={test.pass ? "check" : "warning"} className={test.pass ? "text-emerald-600" : "text-red-600"} size={18} /><span>{test.name}</span></div>)}
                </div>
                <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">Çıkışta kimlik iade + kart teslim alma birlikte yapılır. Kart teslim alınmadan ziyaret kapanmamalıdır.</div>
            </Panel>
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
                        <div className="mb-4 flex justify-between gap-3">
                            <h3 className="text-xl font-bold">PDF Önizleme</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openPrintableRecord({
                                        form: {
                                            fullName: selectedRecord.name,
                                            company: selectedRecord.company,
                                            phone: selectedRecord.phone || "-",
                                            visitReason: selectedRecord.visitReason || "-",
                                            hostPerson: selectedRecord.hostPerson || "-",
                                            cardId: selectedRecord.cardId,
                                        },
                                        recordId: selectedRecord.id,
                                        nowText: selectedRecord.createdAt || selectedRecord.time,
                                        signature: selectedRecord.signature || "",
                                        selectedZones: selectedRecord.selectedZones || [],
                                        zones,
                                        answers: selectedRecord.answers || {},
                                        riskFlags: selectedRecord.riskFlags || [],
                                        questions: selectedRecord.questionSnapshot || questions,
                                        lang: selectedRecord.language || "TR",
                                    })}
                                    className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                                >
                                    PDF
                                </button>
                                <button onClick={() => setSelectedRecord(null)} className="rounded-xl border border-slate-200 px-3 py-2">Kapat</button>
                            </div>
                        </div>
                        <PdfPreview
                            form={{
                                fullName: selectedRecord.name,
                                company: selectedRecord.company,
                                phone: selectedRecord.phone || "-",
                                visitReason: selectedRecord.visitReason || "-",
                                hostPerson: selectedRecord.hostPerson || "-",
                                cardId: selectedRecord.cardId,
                            }}
                            recordId={selectedRecord.id}
                            nowText={selectedRecord.createdAt || selectedRecord.time}
                            signature={selectedRecord.signature || ""}
                            selectedZones={selectedRecord.selectedZones || []}
                            zones={zones}
                            answers={selectedRecord.answers || {}}
                            riskFlags={selectedRecord.riskFlags || []}
                            questions={selectedRecord.questionSnapshot || questions}
                            lang={selectedRecord.language || "TR"}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function QuestionManager({ questions, setQuestions }) {
    const [translatingKeys, setTranslatingKeys] = useState([]);
    const [translationMessage, setTranslationMessage] = useState("");

    const addQuestion = () => {
        setQuestions((current) => [
            ...current,
            {
                key: `question_${Date.now()}`,
                textTr: "Yeni soru",
                textEn: "New question",
                helperTr: "",
                helperEn: "",
                riskyAnswer: null,
                riskNoteTr: "",
                riskNoteEn: "",
                active: true,
            },
        ]);
    };

    const updateQuestion = (key, field, value) => {
        setQuestions((current) => current.map((question) => question.key === key ? { ...question, [field]: value } : question));
    };

    const removeQuestion = (key) => {
        if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
        setQuestions((current) => current.filter((question) => question.key !== key));
    };

    const translateQuestion = async (key) => {
        const question = questions.find((item) => item.key === key);
        if (!question) return;
        setTranslatingKeys((current) => [...current, key]);
        try {
            const [textEn, helperEn, riskNoteEn] = await Promise.all([
                autoTranslateToEnglish(question.textTr),
                autoTranslateToEnglish(question.helperTr),
                autoTranslateToEnglish(question.riskNoteTr),
            ]);
            setQuestions((current) => current.map((item) => item.key === key ? {
                ...item,
                textEn,
                helperEn,
                riskNoteEn,
            } : item));
            setTranslationMessage("İngilizce çeviri otomatik güncellendi.");
        } catch {
            setTranslationMessage("Otomatik çeviri servisine ulaşılamadı. Mevcut çeviri korundu.");
        } finally {
            setTranslatingKeys((current) => current.filter((item) => item !== key));
            window.setTimeout(() => setTranslationMessage(""), 3000);
        }
    };

    const translateAllQuestions = async () => {
        setTranslationMessage("Tüm sorular çevriliyor...");
        for (const question of questions) {
            await translateQuestion(question.key);
        }
        setTranslationMessage("Tüm İngilizce çeviriler güncellendi.");
        window.setTimeout(() => setTranslationMessage(""), 3000);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-bold">Evet / Hayır Soruları</h3>
                    <p className="text-sm text-slate-500">Metinleri Türkçe girin. İngilizce karşılıkları sistem tarafından otomatik oluşturulur.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={translateAllQuestions} disabled={translatingKeys.length > 0 || questions.length === 0} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">Tümünü Otomatik Çevir</button>
                    <button type="button" onClick={addQuestion} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">+ Yeni Soru</button>
                </div>
            </div>
            {translationMessage && <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{translationMessage}</div>}

            {questions.map((question, index) => (
                <div key={question.key} className="rounded-3xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400">Soru {index + 1}</p>
                            <p className="mt-1 font-semibold">{question.textTr || "İsimsiz soru"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <input type="checkbox" checked={question.active} onChange={(event) => updateQuestion(question.key, "active", event.target.checked)} className="h-5 w-5 accent-slate-900" />
                                Aktif
                            </label>
                            <button type="button" onClick={() => removeQuestion(question.key)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">Sil</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <QuestionField label="Soru" value={question.textTr} onChange={(value) => updateQuestion(question.key, "textTr", value)} onBlur={() => translateQuestion(question.key)} />
                        <AutomaticTranslation label="Otomatik İngilizce" value={question.textEn} loading={translatingKeys.includes(question.key)} />
                        <QuestionField label="Yardımcı Metin" value={question.helperTr} onChange={(value) => updateQuestion(question.key, "helperTr", value)} onBlur={() => translateQuestion(question.key)} multiline />
                        <AutomaticTranslation label="Otomatik İngilizce Yardımcı Metin" value={question.helperEn} loading={translatingKeys.includes(question.key)} />
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-600">Riskli Cevap</span>
                            <select value={question.riskyAnswer || "none"} onChange={(event) => updateQuestion(question.key, "riskyAnswer", event.target.value === "none" ? null : event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-slate-500">
                                <option value="none">Risk oluşturmaz</option>
                                <option value="yes">Evet risklidir</option>
                                <option value="no">Hayır risklidir</option>
                            </select>
                        </label>
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                            <b>Durum:</b> {question.active ? "Ziyaretçi formunda gösterilir." : "Pasif, formda gösterilmez."}
                        </div>
                        <QuestionField label="Risk Açıklaması" value={question.riskNoteTr} onChange={(value) => updateQuestion(question.key, "riskNoteTr", value)} onBlur={() => translateQuestion(question.key)} multiline />
                        <AutomaticTranslation label="Otomatik İngilizce Risk Açıklaması" value={question.riskNoteEn} loading={translatingKeys.includes(question.key)} />
                    </div>
                </div>
            ))}

            {questions.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Henüz soru yok. “Yeni Soru” ile ilk soruyu ekleyin.</div>
            )}
        </div>
    );
}

function QuestionField({ label, value, onChange, onBlur, multiline = false }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
            {multiline ? (
                <textarea rows="3" value={value || ""} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} className="w-full resize-none rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
            ) : (
                <input value={value || ""} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} className="h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-slate-500" />
            )}
        </label>
    );
}

function AutomaticTranslation({ label, value, loading }) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-600">{label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${loading ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{loading ? "ÇEVRİLİYOR" : "OTOMATİK"}</span>
            </div>
            <p className="mt-2 min-h-[24px] whitespace-pre-wrap text-sm text-slate-700">{loading ? "Çeviri hazırlanıyor..." : value || "Türkçe metni girdikten sonra otomatik oluşur."}</p>
        </div>
    );
}

function DailyReport({ records, zones, setSelectedRecord, exportCsv }) {
    const [fromDate, setFromDate] = useState(startOfMonthInput());
    const [toDate, setToDate] = useState(todayInput());
    const filteredRecords = useMemo(() => filterRecordsByDate(records, fromDate, toDate), [records, fromDate, toDate]);
    const todayRecords = useMemo(() => filterRecordsByDate(records, todayInput(), todayInput()), [records]);
    const weekRecords = useMemo(() => filterRecordsByDate(records, startOfWeekInput(), todayInput()), [records]);
    const monthRecords = useMemo(() => filterRecordsByDate(records, startOfMonthInput(), todayInput()), [records]);
    const insideRecords = filteredRecords.filter((record) => record.status === "İçeride");
    const exitedRecords = filteredRecords.filter((record) => record.status === "Çıkış Yaptı");
    const pendingRecords = filteredRecords.filter((record) => record.status === "Beklemede");
    const riskRecords = filteredRecords.filter((record) => record.riskFlags?.length);
    const reportDate = `${fromDate || "Başlangıç"} - ${toDate || "Bugün"}`;
    const zoneText = (record) => (record.selectedZones || []).map((id) => zones.find((zone) => zone.id === id)?.name).filter(Boolean).join(", ") || "-";
    const setPreset = (preset) => {
        if (preset === "today") {
            setFromDate(todayInput());
            setToDate(todayInput());
        } else if (preset === "week") {
            setFromDate(startOfWeekInput());
            setToDate(todayInput());
        } else {
            setFromDate(startOfMonthInput());
            setToDate(todayInput());
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold">Dönemsel Giriş Özeti</h3>
                        <p className="text-sm text-slate-500">Bugün, bu hafta ve bu ay gerçekleşen ziyaretçi hareketleri</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <PeriodMetric label="Bugün" records={todayRecords} tone="emerald" />
                    <PeriodMetric label="Bu Hafta" records={weekRecords} tone="blue" />
                    <PeriodMetric label="Bu Ay" records={monthRecords} tone="slate" />
                </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-xl font-bold">Ziyaretçi Raporu</h3>
                        <p className="text-sm text-slate-500">{reportDate} tarih aralığındaki giriş ve çıkış özeti</p>
                    </div>
                    <span className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700">Toplam {filteredRecords.length} kayıt</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPreset("today")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Bugün</button>
                    <button type="button" onClick={() => setPreset("week")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Bu Hafta</button>
                    <button type="button" onClick={() => setPreset("month")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Bu Ay</button>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Başlangıç Tarihi</span>
                        <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-slate-500" />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Bitiş Tarihi</span>
                        <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-slate-500" />
                    </label>
                    <div className="flex items-end">
                        <button type="button" disabled={filteredRecords.length === 0} onClick={() => exportCsv(filteredRecords, `${fromDate || "baslangic"}_${toDate || "bitis"}`)} className="h-11 w-full rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Filtreli Raporu İndir</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <ReportMetric label="Toplam Giriş" value={filteredRecords.length} tone="slate" />
                <ReportMetric label="İçeride" value={insideRecords.length} tone="emerald" />
                <ReportMetric label="Çıkış Yaptı" value={exitedRecords.length} tone="blue" />
                <ReportMetric label="Bekleyen / Riskli" value={pendingRecords.length + riskRecords.length} tone="red" />
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-4">Saat</th>
                            <th>Ziyaretçi</th>
                            <th>Firma</th>
                            <th>Kart</th>
                            <th>Alanlar</th>
                            <th>Çıkış Saati</th>
                            <th>Planlanan Çıkış</th>
                            <th>Durum</th>
                            <th>Risk</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map((record) => (
                            <tr key={record.id} className="border-t border-slate-200">
                                <td className="p-4 font-semibold">{record.time || "-"}</td>
                                <td>{record.name}</td>
                                <td>{record.company}</td>
                                <td>{record.cardId || "-"}</td>
                                <td className="max-w-[220px] whitespace-normal">{zoneText(record)}</td>
                                <td>{record.exitTime || "-"}</td>
                                <td>{record.expectedExitTime || "-"}</td>
                                <td><StatusPill status={record.status} /></td>
                                <td>{record.riskFlags?.length ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{record.riskFlags.length} uyarı</span> : "-"}</td>
                                <td><button onClick={() => setSelectedRecord(record)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Detay</button></td>
                            </tr>
                        ))}
                        {filteredRecords.length === 0 && (
                            <tr><td colSpan="10" className="p-8 text-center text-slate-500">Seçilen tarih aralığında kayıt bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReportList title="İçerideki Ziyaretçiler" records={insideRecords} empty="Şu anda içeride ziyaretçi yok." />
                <ReportList title="Çıkış Yapanlar" records={exitedRecords} empty="Bugün çıkış yapan kayıt yok." />
            </div>
        </div>
    );
}

function PeriodMetric({ label, records, tone }) {
    const exited = records.filter((record) => record.status === "Çıkış Yaptı").length;
    const inside = records.filter((record) => record.status === "İçeride").length;
    const toneClasses = {
        emerald: "bg-emerald-50 text-emerald-800",
        blue: "bg-blue-50 text-blue-800",
        slate: "bg-slate-100 text-slate-800",
    };
    return (
        <div className={`rounded-3xl p-5 ${toneClasses[tone] || toneClasses.slate}`}>
            <p className="text-sm font-bold opacity-75">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                    <p className="text-4xl font-bold">{records.length}</p>
                    <p className="mt-1 text-xs font-semibold opacity-70">toplam giriş</p>
                </div>
                <div className="text-right text-xs font-semibold">
                    <p>{inside} içeride</p>
                    <p className="mt-1">{exited} çıkış yaptı</p>
                </div>
            </div>
        </div>
    );
}

function ReportMetric({ label, value, tone }) {
    const tones = {
        slate: "bg-slate-100 text-slate-800",
        emerald: "bg-emerald-50 text-emerald-700",
        blue: "bg-blue-50 text-blue-700",
        red: "bg-red-50 text-red-700",
    };
    return (
        <div className={`rounded-3xl p-5 ${tones[tone] || tones.slate}`}>
            <p className="text-sm font-semibold opacity-80">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
    );
}

function ReportList({ title, records, empty }) {
    return (
        <div className="rounded-3xl border border-slate-200 p-5">
            <h4 className="font-bold">{title}</h4>
            <div className="mt-4 space-y-3">
                {records.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
                {records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <div className="min-w-0">
                            <p className="truncate font-semibold">{record.name}</p>
                            <p className="truncate text-slate-500">{record.company}</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="font-bold">{record.time || "-"}</p>
                            <p className="text-xs text-slate-500">{record.cardId || "-"}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusPill({ status }) {
    const className = status === "İçeride"
        ? "bg-emerald-50 text-emerald-700"
        : status === "Çıkış Yaptı"
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-50 text-amber-700";
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function LivePreview({ form, answers, questions, signatureTouched, recordId, nowText, selectedZones, zones, riskFlags, staffUnlocked }) {
    return (
        <Panel className="kiosk-preview p-5">
            <div className="mb-5 flex items-center gap-3">
                <BrandLogo />
                <div>
                    <h2 className="text-lg font-bold">Canlı Kayıt Önizleme</h2>
                    <p className="text-sm text-slate-500">Beyan, imza ve yetkili işlemleri</p>
                </div>
            </div>
            <div className="space-y-3 text-sm">
                <SummaryLine label="Kayıt No" value={recordId} />
                <SummaryLine label="Tarih" value={nowText} />
                <SummaryLine label="Ad Soyad" value={form.fullName || "-"} />
                <SummaryLine label="Firma" value={form.company || "-"} />
                <SummaryLine label="Sorular" value={`${Object.values(answers).filter(Boolean).length}/${questions.length}`} />
                <SummaryLine label="Yetkili" value={staffUnlocked ? "Devam ediyor" : "Bekliyor"} />
                <SummaryLine label="Kart" value={form.cardId || "-"} />
                <SummaryLine label="Kimlik" value={form.identityTaken ? "Alındı" : "Yetkili bekliyor"} />
                <SummaryLine label="Alan" value={`${selectedZones.length} seçim`} />
                <SummaryLine label="İmza" value={signatureTouched ? "Alındı" : "Bekliyor"} />
            </div>
            {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mt-5" />}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
                <b>Seçili Alanlar</b>
                <div className="mt-2 flex flex-wrap gap-2">{selectedZones.map((id) => <span key={id} className="rounded-full bg-white px-3 py-1 text-xs">{zones.find((z) => z.id === id)?.name}</span>)}</div>
            </div>
            <div className="mt-5"><FakeQr recordId={recordId} /></div>
        </Panel>
    );
}

function PdfPreview({ form, recordId, nowText, signature, selectedZones = [], zones = [], answers = {}, riskFlags = [], questions = defaultVisitorQuestions, lang = "TR" }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                    <BrandLogo />
                    <div>
                        <h3 className="text-xl font-bold leading-snug">Ziyaretçi Giriş ve Hijyen Beyan Formu</h3>
                        <p className="text-sm text-slate-500">{CLIENT_NAME} · PDF önizleme</p>
                        <PoweredBy className="mt-1" />
                    </div>
                </div>
                <span className="w-fit rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold">{recordId}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <FormField label="Ad Soyad" value={form.fullName || "-"} />
                <FormField label="Firma" value={form.company || "-"} />
                <FormField label="Telefon" value={form.phone || "-"} />
                <FormField label="Ziyaret Nedeni" value={form.visitReason || "-"} />
                <FormField label="Kart ID" value={form.cardId || "-"} />
                <FormField label="Tarih/Saat" value={nowText} />
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
                <b>Beyan Soruları:</b>
                <div className="mt-3 space-y-2">
                    {questions.map((question) => (
                        <div key={question.key} className="grid grid-cols-[1fr_auto] gap-4 rounded-xl bg-white px-3 py-2">
                            <span className="min-w-0 text-slate-600">{questionText(question, lang)}</span>
                            <b className="text-right">{answers[question.key] === "yes" ? translate(lang, "yes") : answers[question.key] === "no" ? translate(lang, "no") : "-"}</b>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm"><b>Seçili Alanlar:</b> {selectedZones.map((id) => zones.find((z) => z.id === id)?.name).filter(Boolean).join(", ") || "-"}</div>
            {riskFlags.length > 0 && <RiskBox riskFlags={riskFlags} className="mt-5" />}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">Ziyaretçi; sağlık/hijyen beyanlarını, tesis güvenliği, kimlik/kart zimmeti ve KVKK metinlerini kabul ettiğini beyan eder.</div>
            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">Dijital İmza</p>
                {signature ? <img src={signature} alt="İmza" className="h-20 w-full object-contain" /> : <div className="h-20 text-sm text-slate-400">İmza kayıtlı / sistem arşivinde</div>}
            </div>
        </div>
    );
}

function RiskBox({ riskFlags, className = "" }) {
    return (
        <div className={`rounded-2xl bg-red-50 p-4 text-sm text-red-700 ${className}`}>
            <div className="mb-2 flex items-center gap-2 font-bold"><Icon name="warning" size={18} /> Yetkili Dikkatine</div>
            <ul className="space-y-1">
                {riskFlags.map((flag, index) => <li key={`${flag}-${index}`}>• {flag}</li>)}
            </ul>
        </div>
    );
}

function BrandLogo({ size = "md" }) {
    const sizeClass = size === "lg" ? "h-20 w-20" : "h-14 w-14";
    return (
        <div className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-emerald-950 shadow-sm ring-1 ring-emerald-900/10`}>
            <img src={CLIENT_LOGO} alt={`${CLIENT_NAME} logosu`} className="h-full w-full object-cover" />
        </div>
    );
}

function PoweredBy({ className = "" }) {
    return <p className={`text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 ${className}`}>Powered by {PROVIDER_NAME}</p>;
}

function FormField({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 break-words font-bold text-slate-900">{value}</p>
        </div>
    );
}

function CheckTile({ title, active, onClick }) {
    return (
        <button type="button" onClick={onClick} className={`rounded-3xl border p-5 text-left transition ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
            <div className="flex items-center justify-between"><b>{title}</b>{active && <Icon name="check" />}</div>
        </button>
    );
}

function StatusCard({ title, value, icon }) {
    return <Panel className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Icon name={icon} /></div></div></Panel>;
}

function SystemState({ title, description, error = false }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
            <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
                <div className={`mx-auto mb-5 w-fit rounded-full p-4 ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                    <Icon name={error ? "warning" : "shield"} size={42} />
                </div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="mt-3 text-slate-600">{description}</p>
                {error && <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Tekrar Dene</button>}
            </div>
        </main>
    );
}

function Panel({ children, className = "" }) { return <section className={`rounded-3xl border-0 bg-white shadow-sm ${className}`}>{children}</section>; }
function SummaryLine({ label, value }) { return <div className="mb-2 flex justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 text-slate-500">{label}</span><b className="min-w-0 break-words text-right text-slate-800">{value}</b></div>; }
function SectionHeader({ icon, title, description }) { return <div className="mb-6 flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-800"><Icon name={icon} size={24} /></div><div><h2 className="text-2xl font-bold">{title}</h2><p className="text-slate-600">{description}</p></div></div>; }

function FakeQr({ recordId }) {
    const qrValue = `${window.location.origin}${window.location.pathname}?record=${encodeURIComponent(recordId)}`;
    return (
        <div className="rounded-3xl bg-slate-50 p-4 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                <QRCode value={qrValue} size={136} className="h-full w-full" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">QR Doğrulama</p>
            <p className="text-xs text-slate-400">{recordId}</p>
        </div>
    );
}

function Icon({ name, size = 24, className = "" }) {
    const commonProps = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": true };
    const icons = {
        check: <svg {...commonProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>,
        warning: <svg {...commonProps}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
        shield: <svg {...commonProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>,
        clipboard: <svg {...commonProps}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></svg>,
        pen: <svg {...commonProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
        user: <svg {...commonProps}><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>,
        factory: <svg {...commonProps}><path d="M3 21h18" /><path d="M5 21V8l6 4V8l6 4V5h3v16" /><path d="M9 17h1" /><path d="M14 17h1" /></svg>,
        cameraOff: <svg {...commonProps}><path d="M3 3l18 18" /><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" /><path d="M9 5h6l2 3h3a2 2 0 0 1 2 2v6.5" /><path d="M3.5 8.5A2 2 0 0 0 2 10v8a2 2 0 0 0 2 2h13" /></svg>,
        card: <svg {...commonProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></svg>,
        lock: <svg {...commonProps}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
        arrowRight: <svg {...commonProps}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
        arrowLeft: <svg {...commonProps}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>,
        file: <svg {...commonProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>,
    };
    return icons[name] || icons.file;
}
