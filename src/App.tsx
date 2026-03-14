import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CalendarDays, Send, Building2, AlertCircle, RotateCcw } from 'lucide-react';

const logoUrl = 'https://static.wixstatic.com/media/185307_b4799e7449644899960340d30f432713~mv2.gif';

const BRAND = {
  dark: '#1C4E57',
  mint: '#74B09B',
  bg: '#F5F7F7',
  border: '#D8E5E1',
  textSoft: '#5E7D84',
  dangerBg: '#FFF4F1',
  danger: '#9F4634',
  selectedBg: '#EAF3F0',
  selectedBorder: '#174A53',
};

const weekdayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const mobileWeekdayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const recurringWeekdayIndexes = [0, 1, 2, 3, 4, 5];
const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const WEBHOOK_URL = 'https://hook.eu1.make.com/f2xwebsgu20ypcp8uf1c86as10peonq9';

const initialClinics = ['קריית אונו', 'חיפה', 'ירושלים', 'באר שבע'];

type SelectedDay = {
  clinic: string;
  fromHour: string;
  toHour: string;
  note: string;
  source: 'manual' | 'recurring';
};

type RecurringRule = {
  enabled: boolean;
  clinic: string;
  fromHour: string;
  toHour: string;
  note: string;
};

type StatusState = {
  type: '' | 'success' | 'error';
  text: string;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function splitClinicValue(value: string) {
  return value ? value.split(' | ').filter(Boolean) : [];
}

function joinClinicValue(values: string[]) {
  return values.filter(Boolean).join(' | ');
}

function Card({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} style={{ background: '#FFFFFF' }}>{children}</div>;
}

function CardHeader({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-3', className)}>{children}</div>;
}

function CardTitle({ className = '', children, style }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-lg font-semibold', className)} style={style}>
      {children}
    </div>
  );
}

function CardContent({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

function Button({ className = '', variant = 'default', style, type = 'button', children, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    minHeight: '40px',
    padding: '0.5rem 1rem',
    borderRadius: '1rem',
    border: variant === 'outline' ? `1px solid ${BRAND.border}` : '1px solid transparent',
    background: variant === 'outline' ? '#FFFFFF' : BRAND.dark,
    color: variant === 'outline' ? BRAND.dark : '#FFFFFF',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  };

  return (
    <button type={type} className={className} style={{ ...baseStyle, ...style }} {...props}>
      {children}
    </button>
  );
}

function Input({ className = '', style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={className}
      style={{
        width: '100%',
        minHeight: '40px',
        padding: '0.625rem 0.875rem',
        borderRadius: '1rem',
        border: `1px solid ${BRAND.border}`,
        background: '#FFFFFF',
        color: BRAND.dark,
        outline: 'none',
        ...style,
      }}
      {...props}
    />
  );
}

function Label({ className = '', children, style, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-sm font-medium', className)} style={{ color: BRAND.dark, ...style }} {...props}>
      {children}
    </label>
  );
}

function Checkbox({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      style={{ width: 18, height: 18, accentColor: BRAND.dark, cursor: 'pointer' }}
    />
  );
}

function Badge({ className = '', children, style }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Textarea({ className = '', style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={className}
      style={{
        width: '100%',
        padding: '0.625rem 0.875rem',
        borderRadius: '1rem',
        border: `1px solid ${BRAND.border}`,
        background: '#FFFFFF',
        color: BRAND.dark,
        outline: 'none',
        ...style,
      }}
      {...props}
    />
  );
}

function MultiClinicSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const selected = splitClinicValue(value);

  return (
    <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: '1rem', padding: '0.75rem', background: '#fff' }}>
      <div className="flex flex-wrap gap-2 mb-3">
        {selected.length ? (
          selected.map((clinic) => (
            <span
              key={clinic}
              className="rounded-full px-3 py-1 text-sm"
              style={{ background: '#EAF3F0', color: BRAND.dark }}
            >
              {clinic}
            </span>
          ))
        ) : (
          <span className="text-sm" style={{ color: BRAND.textSoft }}>לא נבחרה מרפאה</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {options.map((clinic) => {
          const isChecked = selected.includes(clinic);
          return (
            <label key={clinic} className="flex items-center gap-2 text-sm" style={{ color: BRAND.dark, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, clinic]
                    : selected.filter((x) => x !== clinic);
                  onChange(joinClinicValue(next));
                }}
                style={{ width: 16, height: 16, accentColor: BRAND.dark }}
              />
              <span>{clinic}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(v: number | string) {
  return String(v).padStart(2, '0');
}

function formatISO(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDisplayDate(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)}`;
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeToMinutes(t: string) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getMonthGrid(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const firstDay = start.getDay();
  const daysInMonth = end.getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function uniqueHolidayTitles(items: Array<{ hebrew?: string; title?: string }>) {
  return Array.from(new Set((items || []).map((x) => x.hebrew || x.title).filter(Boolean))) as string[];
}

function formatDateTimeLocal(date: Date) {
  const d = new Date(date);
  return `${formatISO(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function safeFileName(value: string) {
  return (value || 'doctor').replace(/[\\/:*?"<>|]+/g, '-').trim();
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function postWebhook(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${responseText}`);
  }

  return { ok: true, responseText };
}

export default function ProdocsClinicAvailabilityApp() {
  const pdfRenderRef = useRef<HTMLDivElement | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const freezeUntil = useMemo(() => addDays(today, 14), [today]);
  const rangeStart = useMemo(() => startOfMonth(today), [today]);
  const rangeEnd = useMemo(() => endOfMonth(addMonths(today, 5)), [today]);

  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [globalNote, setGlobalNote] = useState('');
  const [activeMonth, setActiveMonth] = useState(startOfMonth(today));
  const [selectedDays, setSelectedDays] = useState<Record<string, SelectedDay>>({});
  const [holidayMap, setHolidayMap] = useState<Record<string, string[]>>({});
  const [holidayLoading, setHolidayLoading] = useState(true);
  const [holidayError, setHolidayError] = useState('');
  const [clinicOptions, setClinicOptions] = useState(initialClinics);
  const [newClinic, setNewClinic] = useState('');
  const [status, setStatus] = useState<StatusState>({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurringDays, setRecurringDays] = useState<Record<number, RecurringRule>>({});
  const [isMobile, setIsMobile] = useState(false);

  const visibleMonths = useMemo(() => Array.from({ length: 6 }, (_, i) => addMonths(today, i)), [today]);
  const monthGrid = useMemo(() => getMonthGrid(activeMonth), [activeMonth]);
  const selectedEntries = useMemo(() => Object.entries(selectedDays).sort((a, b) => a[0].localeCompare(b[0])), [selectedDays]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateIsMobile = () => setIsMobile(media.matches);

    updateIsMobile();

    if (media.addEventListener) {
      media.addEventListener('change', updateIsMobile);
      return () => media.removeEventListener('change', updateIsMobile);
    }

    media.addListener(updateIsMobile);
    return () => media.removeListener(updateIsMobile);
  }, []);

  useEffect(() => {
    const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&i=on&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&start=${formatISO(rangeStart)}&end=${formatISO(rangeEnd)}&lg=h`;
    setHolidayLoading(true);

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Hebcal error: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const byDate: Record<string, Array<{ hebrew?: string; title?: string }>> = {};
        (data.items || []).forEach((item: { date: string; hebrew?: string; title?: string }) => {
          const key = item.date;
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push(item);
        });

        const normalized: Record<string, string[]> = {};
        Object.keys(byDate).forEach((k) => {
          normalized[k] = uniqueHolidayTitles(byDate[k]);
        });

        setHolidayMap(normalized);
        setHolidayError('');
      })
      .catch(() => setHolidayError('לא הצלחתי לטעון חגים ומועדים'))
      .finally(() => setHolidayLoading(false));
  }, [rangeStart, rangeEnd]);

  const isDisabledDate = (date: Date) => {
    const current = startOfDay(date);
    const freeze = startOfDay(freezeUntil);
    return current < freeze || date.getDay() === 6;
  };

  const toggleDay = (date: Date) => {
    if (isDisabledDate(date)) return;
    const key = formatISO(date);

    setSelectedDays((prev) => {
      if (prev[key]) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }

      return {
        ...prev,
        [key]: {
          clinic: '',
          fromHour: '08:00',
          toHour: '14:00',
          note: '',
          source: 'manual',
        },
      };
    });
  };

  const updateSelectedDay = (key: string, patch: Partial<SelectedDay>) => {
    setSelectedDays((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return { ...prev, [key]: { ...existing, ...patch } };
    });
  };

  const updateRecurring = (weekdayIndex: number, patch: Partial<RecurringRule>) => {
    setRecurringDays((prev) => {
      const current: RecurringRule = prev[weekdayIndex] ?? {
        enabled: false,
        clinic: '',
        fromHour: '',
        toHour: '',
        note: '',
      };

      return {
        ...prev,
        [weekdayIndex]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const applyRecurring = () => {
    const next = { ...selectedDays };

    visibleMonths.forEach((monthDate) => {
      getMonthGrid(monthDate).forEach((d) => {
        if (!d || isDisabledDate(d)) return;

        const rule = recurringDays[d.getDay()];
        if (!rule?.enabled) return;

        const key = formatISO(d);

        if (!next[key] || next[key].source === 'recurring') {
          next[key] = {
            clinic: rule.clinic || '',
            fromHour: rule.fromHour || '08:00',
            toHour: rule.toHour || '14:00',
            note: rule.note || '',
            source: 'recurring',
          };
        }
      });
    });

    setSelectedDays(next);
    setStatus({ type: 'success', text: 'הקביעות הוחלו על כל התקופה הפתוחה לעדכון' });
  };

  const addClinicOption = () => {
    const value = newClinic.trim();
    if (!value || clinicOptions.includes(value)) return;
    setClinicOptions((prev) => [...prev, value]);
    setNewClinic('');
  };

  const handleReset = () => {
    setActiveMonth(startOfMonth(today));
    setSelectedDays({});
    setGlobalNote('');
    setStatus({ type: '', text: '' });
  };

  const generatePdfAssets = async () => {
    if (!pdfRenderRef.current) {
      return { dataUri: '', base64: '' };
    }

    const canvas = await html2canvas(pdfRenderRef.current, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 20;

    doc.addImage(imgData, 'JPEG', 20, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - 40;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 20;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 20, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight - 40;
    }

    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;

    return {
      dataUri: pdfDataUri,
      base64: pdfBase64,
    };
  };

  const buildPayload = async () => {
    const selectedDaysArray = selectedEntries.map(([date, value], index) => {
      const parsedDate = parseISODate(date);
      const holidays = holidayMap[date] || [];

      return {
        rowNumber: index + 1,
        date,
        displayDate: formatDisplayDate(parsedDate),
        weekdayIndex: parsedDate.getDay(),
        weekday: weekdayNames[parsedDate.getDay()],
        clinic: value.clinic || '',
        fromHour: value.fromHour || '',
        toHour: value.toHour || '',
        note: value.note || '',
        source: value.source || '',
        holidays,
        holidayText: holidays.join(' | '),
        isRecurringSource: value.source === 'recurring',
      };
    });

    const recurringDaysArray = Object.entries(recurringDays)
      .filter(([, value]) => value?.enabled)
      .map(([weekdayIndex, value]) => ({
        weekdayIndex: Number(weekdayIndex),
        weekdayName: weekdayNames[Number(weekdayIndex)],
        clinic: value?.clinic || '',
        fromHour: value?.fromHour || '',
        toHour: value?.toHour || '',
        note: value?.note || '',
      }));

    const pdfAssets = await generatePdfAssets();

    return {
      appName: 'פרודוקס - שירותי רפואה',
      formType: 'clinic_availability',
      submittedAtIso: new Date().toISOString(),
      submittedAtLocal: formatDateTimeLocal(new Date()),
      freezeUntilIso: formatISO(freezeUntil),
      freezeUntilDisplay: formatDisplayDate(freezeUntil),
      doctor: {
        name: doctorName.trim(),
        email: doctorEmail.trim(),
      },
      globalNote,
      clinicOptions,
      recurringDays: recurringDaysArray,
      selectedDays: selectedDaysArray,
      selectedDaysCount: selectedDaysArray.length,
      holidayMap,
      activeMonth: {
        year: activeMonth.getFullYear(),
        month: activeMonth.getMonth() + 1,
        monthName: monthNames[activeMonth.getMonth()],
      },
      pdfData: {
        title: 'פרודוקס - שירותי רפואה',
        subtitle: 'טופס בחירת זמינות למרפאות',
        generatedAtIso: new Date().toISOString(),
        generatedAtLocal: formatDateTimeLocal(new Date()),
        freezeUntilDisplay: formatDisplayDate(freezeUntil),
        doctor: {
          name: doctorName.trim(),
          email: doctorEmail.trim(),
        },
        generalNote: globalNote || '',
        recurringDays: recurringDaysArray,
        selectedDays: selectedDaysArray,
        selectedDaysCount: selectedDaysArray.length,
      },
      pdf: {
        fileName: `prodocs-clinic-availability-${safeFileName(doctorName.trim())}-${formatISO(new Date())}.pdf`,
        mimeType: 'application/pdf',
        dataUri: pdfAssets.dataUri,
        base64: pdfAssets.base64,
      },
    };
  };

  const handleSubmit = async () => {
    const trimmedName = doctorName.trim();
    const trimmedEmail = doctorEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      setStatus({ type: 'error', text: 'יש למלא שם רופא' });
      return;
    }

    if (!trimmedEmail) {
      setStatus({ type: 'error', text: 'יש למלא דוא״ל רופא' });
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setStatus({ type: 'error', text: 'יש למלא דוא״ל תקין' });
      return;
    }

    if (!selectedEntries.length) {
      setStatus({ type: 'error', text: 'יש לבחור לפחות יום אחד לפני שליחה' });
      return;
    }

    for (const [, value] of selectedEntries) {
      const fromMin = timeToMinutes(value.fromHour);
      const toMin = timeToMinutes(value.toHour);

      if (fromMin === null || toMin === null || toMin <= fromMin) {
        setStatus({ type: 'error', text: 'יש לוודא שבכל יום שעת הסיום מאוחרת משעת ההתחלה' });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = await buildPayload();

      if (!payload.pdf.base64) {
        throw new Error('PDF base64 is empty');
      }

      await postWebhook(WEBHOOK_URL, payload);
      setStatus({ type: 'success', text: 'הטופס נשלח ועודכן בהצלחה' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Webhook error';
      setStatus({ type: 'error', text: `אירעה שגיאה בשליחה: ${message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-8" dir="rtl" style={{ background: BRAND.bg }}>
      <div
        ref={pdfRenderRef}
        dir="rtl"
        className="w-[900px] bg-white p-8 text-right"
        style={{
          position: 'fixed',
          top: 0,
          left: '-200vw',
          opacity: 1,
          pointerEvents: 'none',
          fontFamily: 'Arial, sans-serif',
          color: BRAND.dark,
          zIndex: -1,
        }}
      >
        <div className="flex flex-col items-center text-center border-b pb-5 mb-5" style={{ borderColor: BRAND.border }}>
          <img
            src={logoUrl}
            alt="PRODOCS"
            className="w-44 h-auto mb-2"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <div className="text-xl font-semibold">פרודוקס - שירותי רפואה</div>
          <div className="text-sm mt-1">טופס בחירת זמינות למרפאות</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div><strong>שם הרופא:</strong> {doctorName || '-'}</div>
          <div><strong>דוא״ל רופא:</strong> {doctorEmail || '-'}</div>
          <div><strong>נוצר בתאריך:</strong> {formatDateTimeLocal(new Date())}</div>
          <div><strong>נעול עד:</strong> {formatDisplayDate(freezeUntil)}</div>
          <div><strong>מספר ימים שנבחרו:</strong> {selectedEntries.length}</div>
          <div><strong>מספר קביעות:</strong> {Object.values(recurringDays).filter((v) => v?.enabled).length}</div>
        </div>

        {globalNote ? (
          <div className="rounded-xl p-4 mb-5" style={{ background: '#F8FBFA', border: `1px solid ${BRAND.border}` }}>
            <div className="font-semibold mb-2">הערה כללית</div>
            <div className="whitespace-pre-wrap break-words">{globalNote}</div>
          </div>
        ) : null}

        {Object.entries(recurringDays).filter(([, value]) => value?.enabled).length ? (
          <div className="mb-5">
            <div className="font-semibold text-lg mb-3">קביעות לפי יום בשבוע</div>
            <div className="space-y-2">
              {Object.entries(recurringDays).filter(([, value]) => value?.enabled).map(([weekdayIndex, value]) => (
                <div
                  key={weekdayIndex}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#F8FBFA', border: `1px solid ${BRAND.border}` }}
                >
                  {weekdayNames[Number(weekdayIndex)]} | {value.clinic || '-'} | {value.fromHour || '-'}–{value.toHour || '-'}{value.note ? ` | ${value.note}` : ''}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="font-semibold text-lg mb-3">ימים שנבחרו</div>
          <div className="space-y-3">
            {selectedEntries.map(([date, value], index) => {
              const parsedDate = parseISODate(date);
              const holidays = holidayMap[date] || [];

              return (
                <div
                  key={date}
                  className="rounded-xl p-4"
                  style={{
                    border: `2px solid ${BRAND.selectedBorder}`,
                    background: BRAND.selectedBg,
                  }}
                >
                  <div className="font-semibold mb-2">{index + 1}. {formatDisplayDate(parsedDate)} | {weekdayNames[parsedDate.getDay()]}</div>
                  <div className="text-sm mb-1">מרפאה: {value.clinic || '-'}</div>
                  <div className="text-sm mb-1">שעות: {value.fromHour || '-'}–{value.toHour || '-'}</div>
                  {holidays.length ? <div className="text-sm mb-1">{holidays.join(' | ')}</div> : null}
                  {value.note ? <div className="text-sm whitespace-pre-wrap break-words">הערה: {value.note}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <Card className={cn('rounded-[24px] border-0 shadow-sm overflow-hidden', !isMobile && 'sticky top-4 z-10')}>
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${BRAND.dark}, ${BRAND.mint})` }} />
          <CardContent className={cn('py-4 px-4 md:px-6', isMobile && 'pt-4')}>
            <div className={cn('grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 items-center', isMobile && 'gap-3')}>
              <div className="flex flex-col items-center text-center">
                <img src={logoUrl} alt="PRODOCS" className="w-40 md:w-56 h-auto mb-2" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                <div className="text-lg md:text-xl font-semibold" style={{ color: BRAND.dark }}>פרודוקס - שירותי רפואה</div>
                <div className="text-xs md:text-sm mt-1" style={{ color: BRAND.textSoft }}>טופס בחירת זמינות למרפאות – 6 חודשים קדימה</div>
              </div>

              <div className="rounded-[20px] p-3 md:p-4" style={{ background: '#FFFFFF', border: `1px solid ${BRAND.border}` }}>
                <div className="text-sm font-medium mb-2" style={{ color: BRAND.dark }}>פרטי מגיש</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>שם הרופא</Label>
                    <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="mt-1 rounded-2xl" />
                  </div>
                  <div>
                    <Label>דוא״ל רופא</Label>
                    <Input value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} className="mt-1 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <div className="xl:col-span-2 space-y-4 md:space-y-6">
            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardHeader className={isMobile ? 'p-4 pb-3' : ''}>
                <CardTitle className={cn('flex items-center gap-2', isMobile && 'flex-wrap')} style={{ color: BRAND.dark }}>
                  <Building2 className="h-5 w-5" />
                  רשימת מרפאות מועדפת
                  <span className="text-sm font-normal" style={{ color: BRAND.textSoft }}>
                    {' '}– אין חובה למלא. רק אם מרפאתך אינה מופיעה ברשימה
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className={cn('space-y-4', isMobile && 'p-4 pt-0')}>
                <div className="flex flex-wrap gap-2">
                  {clinicOptions.map((clinic) => (
                    <Badge key={clinic} className="rounded-full px-3 py-1" style={{ background: '#EAF3F0', color: BRAND.dark }}>
                      {clinic}
                    </Badge>
                  ))}
                </div>

                <div className={cn('flex gap-2', isMobile && 'flex-col')}>
                  <Input value={newClinic} onChange={(e) => setNewClinic(e.target.value)} placeholder="הוסף מרפאה" className="rounded-2xl" />
                  <Button onClick={addClinicOption} className="rounded-2xl" style={{ background: BRAND.mint, color: '#fff', ...(isMobile ? { width: '100%' } : {}) }}>
                    הוסף
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardHeader className={isMobile ? 'p-4 pb-3' : ''}>
                <CardTitle className={isMobile ? 'leading-7' : ''} style={{ color: BRAND.dark }}>
                  זמינות קבועה לפי יום בשבוע
                  <span className="text-sm font-normal" style={{ color: BRAND.textSoft }}>
                    {' '}– המועדים האפשריים הקבועים לצורך מילוי אוטומטי לחודשים קדימה. אפשר גם לבחור באופן פרטני ביומן מטה.
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', isMobile && 'p-4 pt-0')}>
                {recurringWeekdayIndexes.map((idx) => {
                  const name = weekdayNames[idx];
                  const rule = recurringDays[idx] || { enabled: false, clinic: '', fromHour: '', toHour: '', note: '' };

                  return (
                    <div key={idx} className="rounded-[24px] p-4 space-y-3" style={{ border: `1px solid ${BRAND.border}`, background: '#FFF' }}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium" style={{ color: BRAND.dark }}>{name}</div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={rule.enabled} onCheckedChange={(v) => updateRecurring(idx, { enabled: !!v })} />
                          <span className="text-sm">פעיל</span>
                        </div>
                      </div>

                      <div>
                        <Label>מרפאה מועדפת</Label>
                        <div className="mt-2">
                          <MultiClinicSelect
                            value={rule.clinic || ''}
                            options={clinicOptions}
                            onChange={(value) => updateRecurring(idx, { clinic: value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>משעה</Label>
                          <Input
                            type="time"
                            value={rule.fromHour || ''}
                            onChange={(e) => updateRecurring(idx, { fromHour: e.target.value })}
                            className="mt-2 rounded-2xl"
                          />
                        </div>
                        <div>
                          <Label>עד שעה</Label>
                          <Input
                            type="time"
                            value={rule.toHour || ''}
                            onChange={(e) => updateRecurring(idx, { toHour: e.target.value })}
                            className="mt-2 rounded-2xl"
                          />
                        </div>
                      </div>

                      <Textarea
                        rows={1}
                        value={rule.note || ''}
                        onChange={(e) => updateRecurring(idx, { note: e.target.value })}
                        placeholder="הערה קבועה ליום זה"
                        className="rounded-2xl min-h-[40px] resize-y overflow-hidden"
                      />
                    </div>
                  );
                })}

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    onClick={applyRecurring}
                    className="rounded-2xl"
                    style={{ background: BRAND.dark, ...(isMobile ? { width: '100%' } : {}) }}
                  >
                    החל קביעות על התקופה הפתוחה
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardHeader className={isMobile ? 'p-4 pb-3' : ''}>
                <CardTitle className={cn('flex items-center gap-2', isMobile && 'items-start')} style={{ color: BRAND.dark }}>
                  <CalendarDays className="h-5 w-5 shrink-0 mt-0.5" />
                  בחירה ביומן
                  <span className="text-sm font-normal" style={{ color: BRAND.textSoft }}>
                    {' '}– לא ניתן לשנות את השבועיים הקרובים מהיום. ניתן לבחור או להסיר באופן פרטני כל אחד מהתאריכים או להוסיף הערה פרטנית לכל יום שנבחר.
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className={cn('space-y-4', isMobile && 'p-4 pt-0')}>
                <div className={cn('flex flex-wrap items-center justify-between gap-3', isMobile && 'flex-col items-stretch')}>
                  <div className="text-sm" style={{ color: BRAND.textSoft }}>
                    {`התאריכים עד ${formatDisplayDate(addDays(freezeUntil, -1))} נעולים לעריכה. ימי שבת אינם ניתנים לבחירה.`}
                  </div>

                  <div
                    className="flex gap-2"
                    style={
                      isMobile
                        ? {
                            width: '100%',
                            overflowX: 'auto',
                            flexWrap: 'nowrap',
                            paddingBottom: 6,
                            WebkitOverflowScrolling: 'touch',
                          }
                        : { flexWrap: 'wrap' }
                    }
                  >
                    {visibleMonths.map((m) => {
                      const active = m.getMonth() === activeMonth.getMonth() && m.getFullYear() === activeMonth.getFullYear();

                      return (
                        <Button
                          key={m.toISOString()}
                          variant={active ? 'default' : 'outline'}
                          onClick={() => setActiveMonth(m)}
                          className="rounded-full"
                          style={{
                            ...(active ? { background: BRAND.dark } : { borderColor: BRAND.border, color: BRAND.dark }),
                            ...(isMobile
                              ? {
                                  whiteSpace: 'nowrap',
                                  flex: '0 0 auto',
                                  minHeight: 42,
                                  paddingInline: '0.9rem',
                                }
                              : {}),
                          }}
                        >
                          {monthNames[m.getMonth()]} {m.getFullYear()}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {holidayLoading ? <div className="text-sm" style={{ color: BRAND.textSoft }}>טוען חגים ומועדים…</div> : null}
                {holidayError ? <div className="text-sm" style={{ color: BRAND.danger }}>{holidayError}</div> : null}

                <div
                  className="grid grid-cols-7"
                  style={{
                    gap: isMobile ? '0.2rem' : '0.5rem',
                    position: isMobile ? 'sticky' : undefined,
                    top: isMobile ? 0 : undefined,
                    zIndex: isMobile ? 2 : undefined,
                    background: isMobile ? '#FFFFFF' : undefined,
                    paddingTop: isMobile ? 2 : undefined,
                    paddingBottom: isMobile ? 4 : undefined,
                  }}
                >
                  {(isMobile ? mobileWeekdayNames : weekdayNames).map((d, idx) => (
                    <div
                      key={`${d}-${idx}`}
                      className="text-center font-medium py-2"
                      style={{
                        color: idx === 6 ? BRAND.danger : BRAND.dark,
                        fontSize: isMobile ? '0.72rem' : '0.875rem',
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div
                  className="grid grid-cols-7"
                  style={{
                    gap: isMobile ? '0.2rem' : '0.5rem',
                    alignItems: 'stretch',
                  }}
                >
                  {monthGrid.map((date, idx) => {
                    if (!date) {
                      return (
                        <div
                          key={idx}
                          className="rounded-[16px]"
                          style={{ height: isMobile ? 78 : 112 }}
                        />
                      );
                    }

                    const key = formatISO(date);
                    const disabled = isDisabledDate(date);
                    const selected = !!selectedDays[key];
                    const holidays = holidayMap[key] || [];

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDay(date)}
                        disabled={disabled}
                        className="rounded-[16px] md:rounded-[20px] border text-right transition flex flex-col"
                        style={{
                          minHeight: isMobile ? 96 : 144,
                          padding: isMobile ? '0.35rem' : '0.5rem',
                          borderColor: selected ? BRAND.selectedBorder : BRAND.border,
                          borderWidth: selected ? 2 : 1,
                          background: disabled ? '#EEF2F2' : selected ? BRAND.selectedBg : '#FFF',
                          color: disabled ? '#92A8AD' : BRAND.dark,
                          boxShadow: selected ? '0 0 0 3px rgba(116,176,155,0.32), 0 10px 24px rgba(28,78,87,0.12)' : 'none',
                          opacity: disabled ? 0.95 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div
                            style={{
                              fontSize: isMobile ? '0.63rem' : '1rem',
                              fontWeight: 700,
                              lineHeight: 1.2,
                            }}
                          >
                            {isMobile ? date.getDate() : formatDisplayDate(date)}
                          </div>
                        </div>

                        <div
                          className="mt-1 md:mt-2"
                          style={{
                            fontSize: isMobile ? '0.52rem' : '0.75rem',
                            lineHeight: isMobile ? 1.25 : 1.6,
                          }}
                        >
                          {date.getDay() === 6
                            ? 'שבת'
                            : disabled
                              ? 'נעול'
                              : selected
                                ? `${selectedDays[key].fromHour}–${selectedDays[key].toHour}`
                                : 'בחר'}
                        </div>

                        <div
                          className="mt-1 md:mt-2 rounded-lg md:rounded-xl break-words whitespace-normal font-semibold"
                          style={{
                            minHeight: isMobile ? 24 : 52,
                            padding: isMobile ? '0.18rem 0.25rem' : '0.5rem',
                            fontSize: isMobile ? '0.47rem' : '0.75rem',
                            lineHeight: isMobile ? 1.15 : 1.6,
                            background: holidays.length ? '#E2F3EC' : 'transparent',
                            color: holidays.length ? BRAND.dark : (disabled ? '#92A8AD' : BRAND.textSoft),
                            border: holidays.length ? `1px solid ${BRAND.mint}` : 'none',
                            overflow: 'hidden',
                          }}
                        >
                          {holidays.length
                            ? (isMobile ? holidays[0] : holidays.join(' | '))
                            : ' '}
                        </div>

                        {selected ? (
                          <div
                            className="mt-auto truncate"
                            style={{
                              fontWeight: 700,
                              color: BRAND.dark,
                              fontSize: isMobile ? '0.52rem' : '0.75rem',
                              paddingTop: isMobile ? 2 : 0,
                            }}
                          >
                            {selectedDays[key].clinic || 'נבחר'}
                          </div>
                        ) : (
                          <div className="mt-auto opacity-0" style={{ fontSize: isMobile ? '0.52rem' : '0.75rem' }}>.</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className={cn('rounded-[28px] border-0 shadow-sm', !isMobile && 'sticky top-6')}>
              <CardHeader className={isMobile ? 'p-4 pb-3' : ''}>
                <CardTitle style={{ color: BRAND.dark }}>ימים שנבחרו</CardTitle>
              </CardHeader>

              <CardContent className={cn('space-y-4 max-h-[78vh] overflow-auto', isMobile && 'p-4 pt-0 max-h-none overflow-visible')}>
                <div>
                  <Label>הערה כללית</Label>
                  <Textarea
                    rows={1}
                    value={globalNote}
                    onChange={(e) => setGlobalNote(e.target.value)}
                    placeholder="הערה כללית לכל התקופה"
                    className="mt-2 rounded-2xl min-h-[40px] resize-y overflow-hidden"
                  />
                </div>

                {selectedEntries.length === 0 ? (
                  <div className="text-sm" style={{ color: BRAND.textSoft }}>טרם נבחרו ימים.</div>
                ) : (
                  selectedEntries.map(([key, value]) => {
                    const d = parseISODate(key);
                    const holidays = holidayMap[key] || [];

                    return (
                      <div
                        key={key}
                        className="rounded-[24px] p-4 space-y-3"
                        style={{
                          border: `2px solid ${BRAND.selectedBorder}`,
                          background: BRAND.selectedBg,
                        }}
                      >
                        <div className={cn('flex items-center justify-between gap-2', isMobile && 'flex-col items-start')}>
                          <div>
                            <div className="font-medium" style={{ color: BRAND.dark }}>
                              {formatDisplayDate(d)} | {weekdayNames[d.getDay()]}
                            </div>
                            <div className="text-xs" style={{ color: BRAND.textSoft }}>
                              {value.source === 'recurring' ? 'נוצר מקביעות' : 'נבחר ידנית'}
                            </div>
                          </div>

                          {holidays.length ? (
                            <Badge className="rounded-full border px-3 py-1 font-semibold" style={{ background: '#FFFFFF', color: BRAND.dark, borderColor: BRAND.mint }}>
                              {holidays[0]}
                            </Badge>
                          ) : null}
                        </div>

                        {holidays.length > 1 ? (
                          <div className="text-xs font-medium" style={{ color: BRAND.dark }}>
                            {holidays.slice(1).join(' | ')}
                          </div>
                        ) : null}

                        <div>
                          <Label>מרפאה מועדפת</Label>
                          <div className="mt-2">
                            <MultiClinicSelect
                              value={value.clinic || ''}
                              options={clinicOptions}
                              onChange={(clinic) => updateSelectedDay(key, { clinic })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>משעה</Label>
                            <Input
                              type="time"
                              value={value.fromHour || '08:00'}
                              onChange={(e) => updateSelectedDay(key, { fromHour: e.target.value })}
                              className="mt-2 rounded-2xl"
                            />
                          </div>
                          <div>
                            <Label>עד שעה</Label>
                            <Input
                              type="time"
                              value={value.toHour || '14:00'}
                              onChange={(e) => updateSelectedDay(key, { toHour: e.target.value })}
                              className="mt-2 rounded-2xl"
                            />
                          </div>
                        </div>

                        <Textarea
                          rows={1}
                          value={value.note || ''}
                          onChange={(e) => updateSelectedDay(key, { note: e.target.value })}
                          placeholder="הערה ליום זה"
                          className="rounded-2xl min-h-[40px] resize-y overflow-hidden"
                        />
                      </div>
                    );
                  })
                )}

                {status.text ? (
                  <div
                    className="rounded-[20px] p-3 text-sm flex items-start gap-2"
                    style={{
                      background: status.type === 'error' ? BRAND.dangerBg : '#EEF8F4',
                      color: status.type === 'error' ? BRAND.danger : BRAND.dark,
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {status.text}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-2xl"
                    style={{ background: BRAND.dark, ...(isMobile ? { width: '100%' } : {}) }}
                  >
                    <Send className="h-4 w-4 ml-2" />
                    {isSubmitting ? 'שולח…' : 'שלח / עדכן'}
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="rounded-2xl"
                    style={{ borderColor: BRAND.border, color: BRAND.dark, ...(isMobile ? { width: '100%' } : {}) }}
                  >
                    <RotateCcw className="h-4 w-4 ml-2" />
                    איפוס
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
