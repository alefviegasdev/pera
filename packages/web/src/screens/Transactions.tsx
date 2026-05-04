import React, { useState, useEffect } from 'react';
import { catColor } from '../utils/categories';

const PERIODS = [
  { key: 'today',     label: 'Hoje' },
  { key: 'week',      label: 'Semana' },
  { key: 'month',     label: 'Este mês' },
  { key: 'lastmonth', label: 'Mês passado' },
  { key: '30days',    label: '30 dias' },
  { key: '90days',    label: '90 dias' },
  { key: 'all',       label: 'Tudo' },
];

const Transactions = ({ userId }: { userId: string }) => {
  const [txs, setTxs]       = useState<any[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [period, setPeriod] = useState('month');
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetch_(); }, [userId, period]);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/transactions?user_id=${userId}&period=${period}`);
      const data = await res.json();
      setTxs(data.transactions || []);
      setTotals({ income: data.total_income || 0, expense: data.total_expense || 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* group by date */
  const groups: Record<string, any[]> = {};
  txs.forEach(t => {
    const d = new Date(t.occurred_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  return (
    <div className="screen">
      <header className="page-header">
        <h1 className="font-display" style={{ fontSize: 28 }}>Transações</h1>
      </header>

      <div className="page-content">

        {/* Chips de período */}
        <div className="chips-scroll">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`chip chip-period${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Resumo quick */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p className="text-label" style={{ marginBottom: 4 }}>Entradas</p>
            <p style={{ fontWeight: 700, color: '#16A34A', fontSize: 18 }}>{fmt(totals.income)}</p>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p className="text-label" style={{ marginBottom: 4 }}>Saídas</p>
            <p style={{ fontWeight: 700, color: '#DC2626', fontSize: 18 }}>{fmt(totals.expense)}</p>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))
        ) : Object.keys(groups).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
            <p className="font-display" style={{ fontSize: 18 }}>Sem transações</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-label" style={{ marginBottom: 8, paddingLeft: 2 }}>{date}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(t => {
                  const color = catColor(t.category);
                  return (
                    <button
                      key={t.id}
                      className="card"
                      onClick={() => setSelected(t)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                        textAlign: 'left', cursor: 'pointer', transition: 'transform 0.12s',
                        padding: '14px 16px'
                      }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                      onMouseUp={e => (e.currentTarget.style.transform = '')}
                    >
                      {/* Icon dot */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
                      </div>
                      {/* Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <span className="text-xs text-muted">{t.category}</span>
                          {t.short_code && (
                            <span className="text-xs" style={{ color: '#C4C9D4', fontFamily: 'monospace' }}>
                              #{t.short_code}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Value */}
                      <span style={{ fontWeight: 700, fontSize: 14, flexShrink: 0, color: t.type === 'income' ? '#16A34A' : '#1A1D2E' }}>
                        {t.type === 'income' ? '+' : '−'} {fmt(t.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: catColor(selected.category) + '28',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: catColor(selected.category) }} />
              </div>
              <div>
                <p className="text-xs text-muted" style={{ marginBottom: 2 }}>{selected.category}</p>
                <h2 className="font-display" style={{ fontSize: 22 }}>{selected.description}</h2>
                {selected.short_code && (
                  <span style={{ fontSize: 11, color: '#C4C9D4', fontFamily: 'monospace' }}>#{selected.short_code}</span>
                )}
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-cell">
                <p className="detail-label">Valor</p>
                <p className="detail-value" style={{ color: selected.type === 'income' ? '#16A34A' : '#1A1D2E' }}>
                  {fmt(selected.value)}
                </p>
              </div>
              <div className="detail-cell">
                <p className="detail-label">Data</p>
                <p className="detail-value">{new Date(selected.occurred_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="detail-cell">
                <p className="detail-label">Tipo</p>
                <p className="detail-value">
                  {selected.subtype === 'fixed' ? 'Fixo' : selected.subtype === 'semifixed' ? 'Semi-fixo' : 'Único'}
                </p>
              </div>
              <div className="detail-cell">
                <p className="detail-label">Urgência</p>
                <p className="detail-value">{selected.urgency === 'urgent' ? 'Urgente' : selected.urgency === 'necessity' ? 'Necessidade' : 'Secundário'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelected(null)}>
                Fechar
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }}>
                🗑️ Apagar transação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
