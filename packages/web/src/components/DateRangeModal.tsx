import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

interface DateRangeModalProps {
  currentPeriod: string;
  customStartDate: string | null;
  customEndDate: string | null;
  onSelectPeriod: (period: string) => void;
  onSelectCustomRange: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

const quickFilters = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: '7days', label: '7 dias' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'all', label: 'Total' },
];

const DateRangeModal: React.FC<DateRangeModalProps> = ({
  currentPeriod,
  customStartDate,
  customEndDate,
  onSelectPeriod,
  onSelectCustomRange,
  onClose,
}) => {
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [rangeStart, setRangeStart] = useState<Date | null>(
    customStartDate ? new Date(customStartDate + 'T12:00:00') : null
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(
    customEndDate ? new Date(customEndDate + 'T12:00:00') : null
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = contentRef.current;
    if (el && el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (currentYRef.current - startYRef.current > 80) {
      onClose();
    }
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const handleDayClick = (day: number) => {
    const clicked = new Date(calYear, calMonth, day, 12, 0, 0);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(clicked);
      setRangeEnd(null);
    } else {
      if (clicked < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(clicked);
      } else {
        setRangeEnd(clicked);
      }
    }
  };

  const isInRange = (day: number) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = new Date(calYear, calMonth, day, 12, 0, 0);
    return d > rangeStart && d < rangeEnd;
  };

  const isStart = (day: number) => {
    if (!rangeStart) return false;
    const d = new Date(calYear, calMonth, day, 12, 0, 0);
    return d.toDateString() === rangeStart.toDateString();
  };

  const isEnd = (day: number) => {
    if (!rangeEnd) return false;
    const d = new Date(calYear, calMonth, day, 12, 0, 0);
    return d.toDateString() === rangeEnd.toDateString();
  };

  const handleQuickFilter = (id: string) => {
    onSelectPeriod(id);
  };

  const handleApply = () => {
    if (rangeStart && rangeEnd) {
      const fmtD = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      onSelectCustomRange(fmtD(rangeStart), fmtD(rangeEnd));
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-lg bg-white rounded-t-[2rem] shadow-2xl overflow-y-auto p-8 space-y-8"
        style={{ maxHeight: '85dvh' }}
      >
        {/* Handle */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mb-6" />
          <div className="w-full flex justify-between items-center">
            <h2 className="font-headline font-bold text-2xl text-on-surface">
              Selecionar Período
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors"
            >
              <X size={20} className="text-on-surface" />
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-4">
          <p className="font-headline font-bold text-sm tracking-widest text-on-surface-variant uppercase">
            Filtros Rápidos
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickFilters.map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className={`py-3 px-2 rounded-full font-body font-medium text-sm text-center transition-colors ${
                  currentPeriod === f.id && currentPeriod !== 'custom'
                    ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold'
                    : 'border border-outline-variant/20 hover:bg-surface-container-low'
                } ${f.id === 'all' ? 'col-span-3' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Calendar */}
        <div className="space-y-4">
          <p className="font-headline font-bold text-sm tracking-widest text-on-surface-variant uppercase">
            Período Personalizado
          </p>
          <div className="bg-[#F9F9F7] border border-outline-variant/10 rounded-2xl p-6">
            <div className="flex items-center justify-between px-2 mb-6">
              <button
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
              >
                <ChevronLeft size={20} className="text-on-surface-variant" />
              </button>
              <span className="font-headline font-extrabold text-base tracking-tight text-on-surface">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
              >
                <ChevronRight size={20} className="text-on-surface-variant" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {DAY_LABELS.map(d => (
                <div
                  key={d}
                  className="text-[11px] font-headline font-bold text-outline-variant uppercase tracking-widest pb-4"
                >
                  {d}
                </div>
              ))}
              {/* Previous month trailing days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`prev-${i}`}
                  className="py-2.5 text-sm font-medium text-outline-variant/50"
                >
                  {prevMonthDays - firstDayOfWeek + 1 + i}
                </div>
              ))}
              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const start = isStart(day);
                const end = isEnd(day);
                const inRange = isInRange(day);
                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`py-2.5 text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center
                      ${start ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold rounded-l-full z-10' : ''}
                      ${end ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold rounded-r-full z-10' : ''}
                      ${inRange ? 'bg-tertiary-fixed/30 hover:bg-tertiary-fixed/50' : ''}
                      ${!start && !end && !inRange ? 'hover:bg-surface-container-high rounded-full' : ''}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="pt-4 pb-2">
          <button
            onClick={handleApply}
            disabled={!rangeStart || !rangeEnd}
            className="w-full py-5 bg-[#5D3FD3] text-white rounded-xl font-headline font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40"
          >
            Aplicar Filtro
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;
