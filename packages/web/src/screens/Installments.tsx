import React, { useState, useEffect } from 'react';

const Installments = ({ userId }: { userId: string }) => {
  const [insts, setInsts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/installments?user_id=${userId}`);
      const data = await res.json();
      setInsts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$\u00a00,00';

  return (
    <div className="screen">
      <header className="page-header">
        <h1 className="font-display" style={{ fontSize: 28 }}>Parcelamentos</h1>
      </header>

      <div className="page-content">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)
        ) : insts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>📦</p>
            <p className="font-display" style={{ fontSize: 20 }}>Sem parcelas ativas</p>
          </div>
        ) : (
          insts.map(inst => {
            const pct       = (inst.current_installment / inst.total_installments) * 100;
            const remaining = inst.total_installments - inst.current_installment + 1;

            return (
              <div key={inst.id} className="card">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize: 18, marginBottom: 4 }}>
                      {inst.description}
                    </h3>
                    <span className="text-xs text-muted">{inst.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#4A7FE5', fontSize: 18 }}>
                      {fmt(inst.installment_value)}
                    </p>
                    <span className="text-xs text-muted">/ mês</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="text-xs text-muted">
                      Parcela {inst.current_installment} de {inst.total_installments}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4A7FE5' }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 14, marginTop: 6, borderTop: '1px solid #E8EEFF'
                }}>
                  <span className="text-xs text-muted">
                    Restam {remaining} parcela{remaining !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {fmt(inst.remaining_value)} restante{remaining !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Installments;
