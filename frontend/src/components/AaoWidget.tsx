import { useEffect, useState } from 'react';
import { api } from '../api';

interface AaoMittel { einsatzmittel_id: number; reihenfolge: number }
interface AaoStichwort { id: string; label: string; mittel: AaoMittel[] }
interface AaoConfig { stichwoerter: AaoStichwort[] }
interface Einsatzmittel { id: number; name: string; klarname: string | null; typ: string | null; has_icon: boolean }

export default function AaoWidget() {
  const [config, setConfig] = useState<AaoConfig | null>(null);
  const [resources, setResources] = useState<Map<number, Einsatzmittel>>(new Map());

  useEffect(() => {
    api.get<AaoConfig>('/api/aao').then(setConfig).catch(() => {});
    api.get<Einsatzmittel[]>('/api/einsatzmittel').then((list) => {
      setResources(new Map(list.map((e) => [e.id, e])));
    }).catch(() => {});
  }, []);

  const stichwoerter = config?.stichwoerter ?? [];
  if (stichwoerter.length === 0) return null;

  return (
    <div className="glass rounded-2xl flex-shrink-0 overflow-y-auto" style={{ maxHeight: '40%' }}>
      <div className="px-4 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-muted)' }}>AAO</p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-4">
        {stichwoerter.map((s) => {
          const mittelList = s.mittel
            .slice()
            .sort((a, b) => a.reihenfolge - b.reihenfolge)
            .map((m) => resources.get(m.einsatzmittel_id))
            .filter(Boolean) as Einsatzmittel[];

          return (
            <div key={s.id}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--theme-text)' }}>{s.label}</p>
              {mittelList.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Keine Einsatzmittel zugeordnet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {mittelList.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1"
                      style={{ background: 'var(--theme-bg)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }}
                    >
                      {e.has_icon && (
                        <img src={`/api/einsatzmittel/${e.id}/icon`} alt="" className="w-5 h-5 object-contain" />
                      )}
                      {e.klarname ?? e.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
