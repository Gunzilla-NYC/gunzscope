'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CATEGORY_LABELS, CATEGORY_COLORS, type OriginCategory } from '@/lib/data/itemOrigins';

interface ItemOriginsToolsProps {
  adminSecret: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Release {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  date: string | null;
  description: string | null;
  _count?: { items: number; matchRules: number };
}

interface Item {
  id: string;
  itemName: string;
  quality: string;
  releaseSlug: string;
}

interface MatchRule {
  id: string;
  type: string;
  pattern: string;
  releaseSlug: string;
  priority: number;
}

type SubTab = 'releases' | 'items' | 'rules';

const CATEGORIES: OriginCategory[] = [
  'battlepass', 'pro_pack', 'event', 'ranked', 'early_access', 'reward', 'content_pack',
];

// ─── Shared UI ──────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
      {label}
    </p>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cat = category as OriginCategory;
  const colors = CATEGORY_COLORS[cat];
  const label = CATEGORY_LABELS[cat] ?? category;
  if (!colors) return <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">{category}</span>;
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5"
      style={{
        color: colors.text,
        backgroundColor: `color-mix(in srgb, ${colors.bg} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${colors.bg} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

const inputClass = 'w-full px-2.5 py-1.5 font-mono text-data bg-[var(--gs-dark-3)] border border-white/[0.08] text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:border-[var(--gs-lime)]/30 focus:outline-none';
const selectClass = 'w-full px-2.5 py-1.5 font-mono text-data bg-[var(--gs-dark-3)] border border-white/[0.08] text-[var(--gs-white)] focus:border-[var(--gs-lime)]/30 focus:outline-none';
const btnPrimary = 'font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/5 hover:bg-[var(--gs-lime)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default';
const btnDanger = 'font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] bg-[var(--gs-loss)]/5 hover:bg-[var(--gs-loss)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default';
const btnSecondary = 'font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04] transition-colors cursor-pointer';

// ─── Releases Column ────────────────────────────────────────────────────────

function ReleasesColumn({ adminSecret, releases, onRefresh, selectedSlug, onSelect }: {
  adminSecret: string;
  releases: Release[];
  onRefresh: () => void;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: '', name: '', shortName: '', category: 'event' as string, date: '', description: '' });
  const [saving, setSaving] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const resetForm = () => setForm({ slug: '', name: '', shortName: '', category: 'event', date: '', description: '' });

  const handleCreate = useCallback(async () => {
    if (!form.slug || !form.name || !form.shortName) {
      toast.error('slug, name, and shortName are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entity: 'release',
          slug: form.slug,
          name: form.name,
          shortName: form.shortName,
          category: form.category,
          date: form.date || null,
          description: form.description || null,
        }),
      });
      if (res.ok) {
        toast.success(`Release "${form.slug}" created`);
        resetForm();
        setShowForm(false);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to create');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }, [form, headers, onRefresh]);

  const handleUpdate = useCallback(async () => {
    if (!editSlug) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          entity: 'release',
          slug: editSlug,
          name: form.name || undefined,
          shortName: form.shortName || undefined,
          category: form.category || undefined,
          date: form.date || null,
          description: form.description || null,
        }),
      });
      if (res.ok) {
        toast.success(`Release "${editSlug}" updated`);
        setEditSlug(null);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to update');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }, [editSlug, form, headers, onRefresh]);

  const handleDelete = useCallback(async (slug: string) => {
    if (!confirm(`Delete release "${slug}"? This removes all linked items and rules.`)) return;
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ entity: 'release', slug }),
      });
      if (res.ok) {
        toast.success(`Release "${slug}" deleted`);
        if (selectedSlug === slug) onSelect(null);
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to delete');
      }
    } catch { toast.error('Network error'); }
  }, [headers, selectedSlug, onSelect, onRefresh]);

  const startEdit = (r: Release) => {
    setEditSlug(r.slug);
    setForm({ slug: r.slug, name: r.name, shortName: r.shortName, category: r.category, date: r.date ?? '', description: r.description ?? '' });
    setShowForm(false);
  };

  const releaseForm = (
    <div className="space-y-2 mb-3 p-2 border border-white/[0.06] bg-white/[0.02]">
      {!editSlug && (
        <input className={inputClass} placeholder="slug (e.g. chemtech-bp)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
      )}
      <input className={inputClass} placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input className={inputClass} placeholder="Short Name" value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} />
      <select className={selectClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </select>
      <input className={inputClass} type="date" placeholder="Date (optional)" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={saving} onClick={editSlug ? handleUpdate : handleCreate}>
          {saving ? 'Saving\u2026' : editSlug ? 'Update' : 'Create'}
        </button>
        <button className={btnSecondary} onClick={() => { setShowForm(false); setEditSlug(null); resetForm(); }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel label="Releases" />
        {!showForm && !editSlug && (
          <button className={btnPrimary} onClick={() => { setShowForm(true); resetForm(); }}>+ New</button>
        )}
      </div>

      {(showForm || editSlug) && releaseForm}

      <div className="flex-1 overflow-y-auto space-y-0.5">
        {releases.map(r => (
          <div
            key={r.slug}
            className={`group flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors ${
              selectedSlug === r.slug
                ? 'bg-[var(--gs-lime)]/[0.08] border-l-2 border-[var(--gs-lime)]'
                : 'hover:bg-white/[0.03] border-l-2 border-transparent'
            }`}
            onClick={() => onSelect(selectedSlug === r.slug ? null : r.slug)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-data text-[var(--gs-white)] truncate">{r.shortName}</span>
                <CategoryBadge category={r.category} />
              </div>
              <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">
                {r.slug} &middot; {r._count?.items ?? 0} items &middot; {r._count?.matchRules ?? 0} rules
              </span>
            </div>
            <div className="hidden group-hover:flex gap-1 shrink-0">
              <button
                className="font-mono text-[9px] text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] px-1"
                onClick={e => { e.stopPropagation(); startEdit(r); }}
              >
                Edit
              </button>
              <button
                className="font-mono text-[9px] text-[var(--gs-gray-3)] hover:text-[var(--gs-loss)] px-1"
                onClick={e => { e.stopPropagation(); handleDelete(r.slug); }}
              >
                Del
              </button>
            </div>
          </div>
        ))}
        {releases.length === 0 && (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No releases</p>
        )}
      </div>
      <p className="shrink-0 font-mono text-[9px] text-[var(--gs-gray-2)] mt-2 pt-2 border-t border-white/[0.06]">
        {releases.length} releases &middot; {releases.reduce((sum, r) => sum + (r._count?.items ?? 0), 0)} total items
      </p>
    </div>
  );
}

// ─── Items Column ───────────────────────────────────────────────────────────

function ItemsColumn({ adminSecret, releases, selectedSlug, onSelectSlug }: {
  adminSecret: string;
  releases: Release[];
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelease, setNewRelease] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkRelease, setBulkRelease] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = selectedSlug
        ? `/api/admin/item-origins?entity=items&releaseSlug=${encodeURIComponent(selectedSlug)}`
        : '/api/admin/item-origins?entity=items';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${adminSecret}` } });
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setItems([]); }
    finally { setIsLoading(false); }
  }, [adminSecret, selectedSlug]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = useCallback(async () => {
    const name = newName.trim();
    const slug = newRelease || selectedSlug;
    if (!name || !slug) { toast.error('Item name and release are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'POST',
        headers,
        body: JSON.stringify({ entity: 'item', itemName: name.toLowerCase(), releaseSlug: slug }),
      });
      if (res.ok) {
        toast.success(`Added "${name}"`);
        setNewName('');
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }, [newName, newRelease, selectedSlug, headers, fetchItems]);

  const handleBulkImport = useCallback(async () => {
    const slug = bulkRelease || selectedSlug;
    if (!slug) { toast.error('Select a release first'); return; }
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('No items to import'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entity: 'items',
          items: lines.map(l => ({ itemName: l.toLowerCase(), releaseSlug: slug })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.created ?? lines.length} items`);
        setBulkText('');
        setShowBulk(false);
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }, [bulkText, bulkRelease, selectedSlug, headers, fetchItems]);

  const handleDelete = useCallback(async (itemName: string, quality: string) => {
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ entity: 'item', itemName, quality }),
      });
      if (res.ok) {
        toast.success(`Deleted "${itemName}"`);
        setItems(prev => prev.filter(i => !(i.itemName === itemName && i.quality === quality)));
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch { toast.error('Network error'); }
  }, [headers]);

  const releaseLabel = (slug: string) => releases.find(r => r.slug === slug)?.shortName ?? slug;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel label="Items" />
        <button className={showBulk ? btnSecondary : btnPrimary} onClick={() => setShowBulk(!showBulk)}>
          {showBulk ? 'Single' : 'Bulk'}
        </button>
      </div>

      {/* Release filter */}
      <select
        className={`${selectClass} mb-2`}
        value={selectedSlug ?? ''}
        onChange={e => onSelectSlug(e.target.value || null)}
      >
        <option value="">All releases</option>
        {releases.map(r => <option key={r.slug} value={r.slug}>{r.shortName} ({r._count?.items ?? 0})</option>)}
      </select>

      {/* Add form */}
      {showBulk ? (
        <div className="space-y-2 mb-3 p-2 border border-white/[0.06] bg-white/[0.02]">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="One item name per line"
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
          />
          <select className={selectClass} value={bulkRelease || selectedSlug || ''} onChange={e => setBulkRelease(e.target.value)}>
            <option value="">Select release</option>
            {releases.map(r => <option key={r.slug} value={r.slug}>{r.shortName}</option>)}
          </select>
          <button className={btnPrimary} disabled={saving} onClick={handleBulkImport}>
            {saving ? 'Importing\u2026' : `Import ${bulkText.split('\n').filter(l => l.trim()).length} items`}
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 mb-3">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Item name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          {!selectedSlug && (
            <select className="w-28 px-1.5 py-1 font-mono text-[9px] bg-[var(--gs-dark-3)] border border-white/[0.08] text-[var(--gs-white)] focus:outline-none" value={newRelease} onChange={e => setNewRelease(e.target.value)}>
              <option value="">Release</option>
              {releases.map(r => <option key={r.slug} value={r.slug}>{r.shortName}</option>)}
            </select>
          )}
          <button className={btnPrimary} disabled={saving || !newName.trim()} onClick={handleAdd}>Add</button>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="group flex items-center gap-2 py-1 px-1 border-b border-white/[0.04] last:border-b-0">
              <span className="font-mono text-data text-[var(--gs-white)] flex-1 truncate">{item.itemName}</span>
              {item.quality && (
                <span className="font-mono text-[9px] text-[var(--gs-purple)] shrink-0">{item.quality}</span>
              )}
              {!selectedSlug && (
                <span className="font-mono text-[9px] text-[var(--gs-gray-2)] shrink-0">{releaseLabel(item.releaseSlug)}</span>
              )}
              <button
                className="opacity-0 group-hover:opacity-100 font-mono text-[9px] text-[var(--gs-loss)] hover:text-[var(--gs-loss)] px-1 transition-opacity cursor-pointer"
                onClick={() => handleDelete(item.itemName, item.quality)}
              >
                &times;
              </button>
            </div>
          ))}
          {items.length === 0 && !isLoading && (
            <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">
              {selectedSlug ? 'No items in this release' : 'No items'}
            </p>
          )}
        </div>
      )}
      <p className="shrink-0 font-mono text-[9px] text-[var(--gs-gray-2)] mt-2 pt-2 border-t border-white/[0.06]">
        {items.length} items{selectedSlug ? ` in ${releaseLabel(selectedSlug)}` : ' total'}
      </p>
    </div>
  );
}

// ─── Match Rules Column ─────────────────────────────────────────────────────

function MatchRulesColumn({ adminSecret, releases }: {
  adminSecret: string;
  releases: Release[];
}) {
  const [rules, setRules] = useState<MatchRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ type: 'prefix', pattern: '', releaseSlug: '', priority: '100' });
  const [saving, setSaving] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSecret}`,
  };

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/item-origins?entity=rules', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      setRules((data.rules ?? []).sort((a: MatchRule, b: MatchRule) => b.priority - a.priority));
    } catch { setRules([]); }
    finally { setIsLoading(false); }
  }, [adminSecret]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleCreate = useCallback(async () => {
    if (!form.pattern.trim() || !form.releaseSlug) {
      toast.error('Pattern and release are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entity: 'rule',
          type: form.type,
          pattern: form.pattern.trim().toLowerCase(),
          releaseSlug: form.releaseSlug,
          priority: parseInt(form.priority) || 0,
        }),
      });
      if (res.ok) {
        toast.success(`Rule "${form.pattern}" created`);
        setForm(f => ({ ...f, pattern: '' }));
        fetchRules();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }, [form, headers, fetchRules]);

  const handleDelete = useCallback(async (type: string, pattern: string) => {
    try {
      const res = await fetch('/api/admin/item-origins', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ entity: 'rule', type, pattern }),
      });
      if (res.ok) {
        toast.success(`Rule "${pattern}" deleted`);
        setRules(prev => prev.filter(r => !(r.type === type && r.pattern === pattern)));
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed');
      }
    } catch { toast.error('Network error'); }
  }, [headers]);

  const releaseLabel = (slug: string) => releases.find(r => r.slug === slug)?.shortName ?? slug;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionLabel label="Match Rules" />

      {/* Create form */}
      <div className="space-y-2 mb-3 p-2 border border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-2">
          <button
            className={`flex-1 font-mono text-[9px] uppercase tracking-wider px-2 py-1 border transition-colors cursor-pointer ${
              form.type === 'prefix'
                ? 'border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/10'
                : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04]'
            }`}
            onClick={() => setForm(f => ({ ...f, type: 'prefix' }))}
          >
            Prefix
          </button>
          <button
            className={`flex-1 font-mono text-[9px] uppercase tracking-wider px-2 py-1 border transition-colors cursor-pointer ${
              form.type === 'contains'
                ? 'border-[var(--gs-purple)]/30 text-[var(--gs-purple)] bg-[var(--gs-purple)]/10'
                : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04]'
            }`}
            onClick={() => setForm(f => ({ ...f, type: 'contains' }))}
          >
            Contains
          </button>
        </div>
        <input className={inputClass} placeholder="Pattern (lowercase)" value={form.pattern} onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))} />
        <div className="flex gap-2">
          <select className={`${selectClass} flex-1`} value={form.releaseSlug} onChange={e => setForm(f => ({ ...f, releaseSlug: e.target.value }))}>
            <option value="">Select release</option>
            {releases.map(r => <option key={r.slug} value={r.slug}>{r.shortName}</option>)}
          </select>
          <input
            className="w-16 px-2 py-1.5 font-mono text-data bg-[var(--gs-dark-3)] border border-white/[0.08] text-[var(--gs-white)] text-center focus:outline-none"
            type="number"
            placeholder="Pri"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          />
        </div>
        <button className={btnPrimary} disabled={saving || !form.pattern.trim() || !form.releaseSlug} onClick={handleCreate}>
          {saving ? 'Creating\u2026' : 'Add Rule'}
        </button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {rules.map(rule => (
            <div key={rule.id} className="group flex items-center gap-2 py-1.5 px-1 border-b border-white/[0.04] last:border-b-0">
              <span
                className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                style={{
                  color: rule.type === 'prefix' ? 'var(--gs-lime)' : 'var(--gs-purple)',
                  backgroundColor: rule.type === 'prefix' ? 'color-mix(in srgb, var(--gs-lime) 10%, transparent)' : 'color-mix(in srgb, var(--gs-purple) 10%, transparent)',
                  border: `1px solid ${rule.type === 'prefix' ? 'color-mix(in srgb, var(--gs-lime) 20%, transparent)' : 'color-mix(in srgb, var(--gs-purple) 20%, transparent)'}`,
                }}
              >
                {rule.type}
              </span>
              <span className="font-mono text-data text-[var(--gs-white)] flex-1 truncate">{rule.pattern}</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-2)] shrink-0">{releaseLabel(rule.releaseSlug)}</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)] shrink-0 w-6 text-right">{rule.priority}</span>
              <button
                className="opacity-0 group-hover:opacity-100 font-mono text-[9px] text-[var(--gs-loss)] px-1 transition-opacity cursor-pointer"
                onClick={() => handleDelete(rule.type, rule.pattern)}
              >
                &times;
              </button>
            </div>
          ))}
          {rules.length === 0 && !isLoading && (
            <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No rules</p>
          )}
        </div>
      )}
      <p className="shrink-0 font-mono text-[9px] text-[var(--gs-gray-2)] mt-2 pt-2 border-t border-white/[0.06]">
        {rules.length} rules
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ItemOriginsTools({ adminSecret }: ItemOriginsToolsProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/item-origins?entity=releases', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      setReleases(data.releases ?? []);
    } catch { setReleases([]); }
    finally { setIsLoading(false); }
  }, [adminSecret]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  if (isLoading) {
    return <p className="font-mono text-caption text-[var(--gs-gray-3)] py-8 text-center">Loading item database&hellip;</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] flex-1 min-h-0">
      <div className="p-5 flex flex-col min-h-0">
        <ReleasesColumn
          adminSecret={adminSecret}
          releases={releases}
          onRefresh={fetchReleases}
          selectedSlug={selectedSlug}
          onSelect={setSelectedSlug}
        />
      </div>
      <div className="p-5 flex flex-col min-h-0">
        <ItemsColumn
          adminSecret={adminSecret}
          releases={releases}
          selectedSlug={selectedSlug}
          onSelectSlug={setSelectedSlug}
        />
      </div>
      <div className="p-5 flex flex-col min-h-0">
        <MatchRulesColumn
          adminSecret={adminSecret}
          releases={releases}
        />
      </div>
    </div>
  );
}
