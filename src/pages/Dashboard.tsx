import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Werkzeuge, Mitarbeiter, Projekte, Werkzeugzuweisung, Wartung, Werkzeugausgabe,
} from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { format, parseISO, differenceInDays, formatDistance } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wrench, Users, FolderKanban, ArrowLeftRight, Settings2, Package,
  Plus, Pencil, Trash2, AlertTriangle, Clock, TrendingUp, Euro,
  Calendar, RefreshCw, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Lookup Maps ───────────────────────────────────────────────
const KATEGORIE_LABELS: Record<string, string> = {
  handwerkzeuge: 'Handwerkzeuge',
  messgeraete: 'Messgeräte',
  pruefgeraete: 'Prüfgeräte',
  kabelwerkzeuge: 'Kabelwerkzeuge',
  leitern_gerueste: 'Leitern & Gerüste',
  sicherheitsausruestung: 'Sicherheitsausr.',
  sonstiges: 'Sonstiges',
  elektrowerkzeuge: 'Elektrowerkzeuge',
};

const ZUSTAND_LABELS: Record<string, string> = {
  neu: 'Neu',
  sehr_gut: 'Sehr gut',
  gut: 'Gut',
  befriedigend: 'Befriedigend',
  reparaturbeduerftig: 'Reparaturbedürftig',
  defekt: 'Defekt',
};

const ABTEILUNG_LABELS: Record<string, string> = {
  elektroinstallation: 'Elektroinstallation',
  wartung_service: 'Wartung & Service',
  projektleitung: 'Projektleitung',
  lager_logistik: 'Lager & Logistik',
  verwaltung: 'Verwaltung',
};

const WARTUNGSART_LABELS: Record<string, string> = {
  inspektion: 'Inspektion',
  reparatur: 'Reparatur',
  kalibrierung: 'Kalibrierung',
  reinigung: 'Reinigung',
  pruefung_dguv: 'Prüfung nach DGUV',
  sonstiges: 'Sonstiges',
};

const DURCHGEFUEHRT_LABELS: Record<string, string> = {
  intern: 'Intern',
  extern: 'Extern / Dienstleister',
};

// ─── Utility Functions ─────────────────────────────────────────
function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr.split('T')[0]), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Availability Gauge SVG ────────────────────────────────────
function AvailabilityGauge({ available, total, size = 280 }: { available: number; total: number; size?: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const r = size * 0.38;
  const strokeW = size * 0.036;
  const cx = size / 2;
  const cy = size * 0.52;
  const startAngle = Math.PI;
  const endAngle = 0;
  const arcLength = Math.PI * r;
  const filledLength = arcLength * (pct / 100);

  const describeArc = (radius: number) => {
    const sx = cx + radius * Math.cos(startAngle);
    const sy = cy - radius * Math.sin(startAngle);
    const ex = cx + radius * Math.cos(endAngle);
    const ey = cy - radius * Math.sin(endAngle);
    return `M ${sx} ${sy} A ${radius} ${radius} 0 0 1 ${ex} ${ey}`;
  };

  const gaugeColor = pct >= 70 ? 'hsl(175 55% 40%)' : pct >= 40 ? 'hsl(28 90% 52%)' : 'hsl(0 72% 51%)';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        <path d={describeArc(r)} fill="none" stroke="hsl(210 15% 89%)" strokeWidth={strokeW} strokeLinecap="round" />
        <path
          d={describeArc(r)}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
          style={{ transition: 'stroke-dasharray 0.8s ease-out, stroke 0.5s ease' }}
        />
        <text
          x={cx}
          y={cy - size * 0.05}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: size * 0.17, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {pct}%
        </text>
        <text
          x={cx}
          y={cy + size * 0.07}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.045, fontWeight: 400, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          verfügbar
        </text>
      </svg>
      <p className="text-sm text-muted-foreground -mt-1">{available} von {total} Werkzeuge verfügbar</p>
    </div>
  );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────
function DeleteConfirmDialog({
  open, onOpenChange, name, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
      toast.success(`"${name}" wurde gelöscht.`);
      onOpenChange(false);
    } catch {
      toast.error('Eintrag konnte nicht gelöscht werden.');
    } finally {
      setDeleting(false);
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchtest du &quot;{name}&quot; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? 'Löscht...' : 'Löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── CRUD: Werkzeuge ───────────────────────────────────────────
function WerkzeugeDialog({
  open, onOpenChange, record, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Werkzeuge | null;
  onSuccess: () => void;
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    werkzeugname: '', kategorie: '' as string, hersteller: '', modellnummer: '',
    seriennummer: '', kaufdatum: todayStr(), kaufpreis: '' as string | number,
    zustand: 'neu' as string, lagerort: '', bemerkungen: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        werkzeugname: record?.fields.werkzeugname ?? '',
        kategorie: record?.fields.kategorie ?? '',
        hersteller: record?.fields.hersteller ?? '',
        modellnummer: record?.fields.modellnummer ?? '',
        seriennummer: record?.fields.seriennummer ?? '',
        kaufdatum: record?.fields.kaufdatum?.split('T')[0] ?? todayStr(),
        kaufpreis: record?.fields.kaufpreis ?? '',
        zustand: record?.fields.zustand ?? 'neu',
        lagerort: record?.fields.lagerort ?? '',
        bemerkungen: record?.fields.bemerkungen ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Werkzeuge['fields'] = {
        werkzeugname: form.werkzeugname || undefined,
        kategorie: (form.kategorie || undefined) as Werkzeuge['fields']['kategorie'],
        hersteller: form.hersteller || undefined,
        modellnummer: form.modellnummer || undefined,
        seriennummer: form.seriennummer || undefined,
        kaufdatum: form.kaufdatum || undefined,
        kaufpreis: form.kaufpreis !== '' ? Number(form.kaufpreis) : undefined,
        zustand: (form.zustand || undefined) as Werkzeuge['fields']['zustand'],
        lagerort: form.lagerort || undefined,
        bemerkungen: form.bemerkungen || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateWerkzeugeEntry(record!.record_id, fields);
        toast.success('Werkzeug aktualisiert.');
      } else {
        await LivingAppsService.createWerkzeugeEntry(fields);
        toast.success('Werkzeug erstellt.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Werkzeug bearbeiten' : 'Neues Werkzeug'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere die Werkzeugdaten.' : 'Füge ein neues Werkzeug hinzu.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="w-name">Werkzeugname *</Label>
            <Input id="w-name" value={form.werkzeugname} onChange={e => setForm(p => ({ ...p, werkzeugname: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategorie</Label>
              <Select value={form.kategorie || 'none'} onValueChange={v => setForm(p => ({ ...p, kategorie: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Auswahl</SelectItem>
                  {Object.entries(KATEGORIE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zustand</Label>
              <Select value={form.zustand || 'none'} onValueChange={v => setForm(p => ({ ...p, zustand: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Auswahl</SelectItem>
                  {Object.entries(ZUSTAND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hersteller</Label>
              <Input value={form.hersteller} onChange={e => setForm(p => ({ ...p, hersteller: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Modellnummer</Label>
              <Input value={form.modellnummer} onChange={e => setForm(p => ({ ...p, modellnummer: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Seriennummer</Label>
              <Input value={form.seriennummer} onChange={e => setForm(p => ({ ...p, seriennummer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Lagerort</Label>
              <Input value={form.lagerort} onChange={e => setForm(p => ({ ...p, lagerort: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kaufdatum</Label>
              <Input type="date" value={form.kaufdatum} onChange={e => setForm(p => ({ ...p, kaufdatum: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Kaufpreis (EUR)</Label>
              <Input type="number" step="0.01" value={form.kaufpreis} onChange={e => setForm(p => ({ ...p, kaufpreis: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bemerkungen</Label>
            <Textarea value={form.bemerkungen} onChange={e => setForm(p => ({ ...p, bemerkungen: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Erstellen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WerkzeugeTab({ werkzeuge, onRefresh }: { werkzeuge: Werkzeuge[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Werkzeuge | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Werkzeuge | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Werkzeuge ({werkzeuge.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Werkzeugname</TableHead>
              <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
              <TableHead className="hidden md:table-cell">Hersteller</TableHead>
              <TableHead className="hidden sm:table-cell">Zustand</TableHead>
              <TableHead className="hidden md:table-cell">Lagerort</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {werkzeuge.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Noch keine Werkzeuge vorhanden.</TableCell></TableRow>
            ) : werkzeuge.map(w => (
              <TableRow key={w.record_id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{w.fields.werkzeugname || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{w.fields.kategorie ? KATEGORIE_LABELS[w.fields.kategorie] ?? w.fields.kategorie : '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{w.fields.hersteller || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <ZustandBadge zustand={w.fields.zustand} />
                </TableCell>
                <TableCell className="hidden md:table-cell">{w.fields.lagerort || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditRecord(w)} aria-label="Bearbeiten"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(w)} aria-label="Löschen" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <WerkzeugeDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} />
      <WerkzeugeDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name={deleteRecord?.fields.werkzeugname ?? ''}
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteWerkzeugeEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

function ZustandBadge({ zustand }: { zustand?: string }) {
  if (!zustand) return <Badge variant="outline">-</Badge>;
  const colorMap: Record<string, string> = {
    neu: 'bg-green-100 text-green-800',
    sehr_gut: 'bg-green-50 text-green-700',
    gut: 'bg-blue-50 text-blue-700',
    befriedigend: 'bg-amber-50 text-amber-700',
    reparaturbeduerftig: 'bg-red-50 text-red-700',
    defekt: 'bg-red-100 text-red-800',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[zustand] ?? ''}`}>{ZUSTAND_LABELS[zustand] ?? zustand}</span>;
}

// ─── CRUD: Mitarbeiter ─────────────────────────────────────────
function MitarbeiterDialog({
  open, onOpenChange, record, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Mitarbeiter | null;
  onSuccess: () => void;
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vorname: '', nachname: '', personalnummer: '', abteilung: '' as string, telefon: '', email: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        vorname: record?.fields.vorname ?? '',
        nachname: record?.fields.nachname ?? '',
        personalnummer: record?.fields.personalnummer ?? '',
        abteilung: record?.fields.abteilung ?? '',
        telefon: record?.fields.telefon ?? '',
        email: record?.fields.email ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Mitarbeiter['fields'] = {
        vorname: form.vorname || undefined,
        nachname: form.nachname || undefined,
        personalnummer: form.personalnummer || undefined,
        abteilung: (form.abteilung || undefined) as Mitarbeiter['fields']['abteilung'],
        telefon: form.telefon || undefined,
        email: form.email || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateMitarbeiterEntry(record!.record_id, fields);
        toast.success('Mitarbeiter aktualisiert.');
      } else {
        await LivingAppsService.createMitarbeiterEntry(fields);
        toast.success('Mitarbeiter erstellt.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere die Mitarbeiterdaten.' : 'Füge einen neuen Mitarbeiter hinzu.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vorname *</Label>
              <Input value={form.vorname} onChange={e => setForm(p => ({ ...p, vorname: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Nachname *</Label>
              <Input value={form.nachname} onChange={e => setForm(p => ({ ...p, nachname: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Personalnummer</Label>
              <Input value={form.personalnummer} onChange={e => setForm(p => ({ ...p, personalnummer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Abteilung</Label>
              <Select value={form.abteilung || 'none'} onValueChange={v => setForm(p => ({ ...p, abteilung: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Auswahl</SelectItem>
                  {Object.entries(ABTEILUNG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input type="tel" value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Erstellen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MitarbeiterTab({ mitarbeiter, onRefresh }: { mitarbeiter: Mitarbeiter[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Mitarbeiter | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Mitarbeiter | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mitarbeiter ({mitarbeiter.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Personalnr.</TableHead>
              <TableHead className="hidden sm:table-cell">Abteilung</TableHead>
              <TableHead className="hidden md:table-cell">Telefon</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mitarbeiter.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Noch keine Mitarbeiter vorhanden.</TableCell></TableRow>
            ) : mitarbeiter.map(m => (
              <TableRow key={m.record_id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{m.fields.personalnummer || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{m.fields.abteilung ? ABTEILUNG_LABELS[m.fields.abteilung] ?? m.fields.abteilung : '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{m.fields.telefon || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditRecord(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(m)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <MitarbeiterDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} />
      <MitarbeiterDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name={[deleteRecord?.fields.vorname, deleteRecord?.fields.nachname].filter(Boolean).join(' ') || 'Mitarbeiter'}
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteMitarbeiterEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

// ─── CRUD: Projekte ────────────────────────────────────────────
function ProjekteDialog({
  open, onOpenChange, record, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Projekte | null;
  onSuccess: () => void;
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projektname: '', projektnummer: '', kundenname: '', strasse: '', hausnummer: '',
    postleitzahl: '', stadt: '', startdatum: '', enddatum: '', projektleiter: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        projektname: record?.fields.projektname ?? '',
        projektnummer: record?.fields.projektnummer ?? '',
        kundenname: record?.fields.kundenname ?? '',
        strasse: record?.fields.strasse ?? '',
        hausnummer: record?.fields.hausnummer ?? '',
        postleitzahl: record?.fields.postleitzahl ?? '',
        stadt: record?.fields.stadt ?? '',
        startdatum: record?.fields.startdatum?.split('T')[0] ?? '',
        enddatum: record?.fields.enddatum?.split('T')[0] ?? '',
        projektleiter: record?.fields.projektleiter ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Projekte['fields'] = {
        projektname: form.projektname || undefined,
        projektnummer: form.projektnummer || undefined,
        kundenname: form.kundenname || undefined,
        strasse: form.strasse || undefined,
        hausnummer: form.hausnummer || undefined,
        postleitzahl: form.postleitzahl || undefined,
        stadt: form.stadt || undefined,
        startdatum: form.startdatum || undefined,
        enddatum: form.enddatum || undefined,
        projektleiter: form.projektleiter || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateProjekteEntry(record!.record_id, fields);
        toast.success('Projekt aktualisiert.');
      } else {
        await LivingAppsService.createProjekteEntry(fields);
        toast.success('Projekt erstellt.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere die Projektdaten.' : 'Füge ein neues Projekt hinzu.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Projektname *</Label>
              <Input value={form.projektname} onChange={e => setForm(p => ({ ...p, projektname: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Projektnummer</Label>
              <Input value={form.projektnummer} onChange={e => setForm(p => ({ ...p, projektnummer: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kundenname</Label>
            <Input value={form.kundenname} onChange={e => setForm(p => ({ ...p, kundenname: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Straße</Label>
              <Input value={form.strasse} onChange={e => setForm(p => ({ ...p, strasse: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Hausnr.</Label>
              <Input value={form.hausnummer} onChange={e => setForm(p => ({ ...p, hausnummer: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>PLZ</Label>
              <Input value={form.postleitzahl} onChange={e => setForm(p => ({ ...p, postleitzahl: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Stadt</Label>
              <Input value={form.stadt} onChange={e => setForm(p => ({ ...p, stadt: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Startdatum</Label>
              <Input type="date" value={form.startdatum} onChange={e => setForm(p => ({ ...p, startdatum: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Enddatum</Label>
              <Input type="date" value={form.enddatum} onChange={e => setForm(p => ({ ...p, enddatum: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Projektleiter</Label>
            <Input value={form.projektleiter} onChange={e => setForm(p => ({ ...p, projektleiter: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Erstellen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjekteTab({ projekte, onRefresh }: { projekte: Projekte[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Projekte | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Projekte | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projekte ({projekte.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projektname</TableHead>
              <TableHead className="hidden sm:table-cell">Projektnr.</TableHead>
              <TableHead className="hidden sm:table-cell">Kunde</TableHead>
              <TableHead className="hidden md:table-cell">Zeitraum</TableHead>
              <TableHead className="hidden md:table-cell">Projektleiter</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projekte.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Noch keine Projekte vorhanden.</TableCell></TableRow>
            ) : projekte.map(p => (
              <TableRow key={p.record_id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{p.fields.projektname || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.fields.projektnummer || '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.fields.kundenname || '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(p.fields.startdatum)} – {formatDate(p.fields.enddatum)}</TableCell>
                <TableCell className="hidden md:table-cell">{p.fields.projektleiter || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditRecord(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(p)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ProjekteDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} />
      <ProjekteDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name={deleteRecord?.fields.projektname ?? 'Projekt'}
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteProjekteEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

// ─── CRUD: Werkzeugzuweisung ───────────────────────────────────
function ZuweisungDialog({
  open, onOpenChange, record, onSuccess, werkzeuge, mitarbeiter, projekte,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Werkzeugzuweisung | null;
  onSuccess: () => void;
  werkzeuge: Werkzeuge[];
  mitarbeiter: Mitarbeiter[];
  projekte: Projekte[];
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    werkzeug: '', mitarbeiter: '', projekt: '',
    zuweisungsdatum: todayStr(), geplante_rueckgabe: '', tatsaechliche_rueckgabe: '', notizen: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        werkzeug: extractRecordId(record?.fields.werkzeug) ?? '',
        mitarbeiter: extractRecordId(record?.fields.mitarbeiter) ?? '',
        projekt: extractRecordId(record?.fields.projekt) ?? '',
        zuweisungsdatum: record?.fields.zuweisungsdatum?.split('T')[0] ?? todayStr(),
        geplante_rueckgabe: record?.fields.geplante_rueckgabe?.split('T')[0] ?? '',
        tatsaechliche_rueckgabe: record?.fields.tatsaechliche_rueckgabe?.split('T')[0] ?? '',
        notizen: record?.fields.notizen ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Werkzeugzuweisung['fields'] = {
        werkzeug: form.werkzeug ? createRecordUrl(APP_IDS.WERKZEUGE, form.werkzeug) : undefined,
        mitarbeiter: form.mitarbeiter ? createRecordUrl(APP_IDS.MITARBEITER, form.mitarbeiter) : undefined,
        projekt: form.projekt ? createRecordUrl(APP_IDS.PROJEKTE, form.projekt) : undefined,
        zuweisungsdatum: form.zuweisungsdatum || undefined,
        geplante_rueckgabe: form.geplante_rueckgabe || undefined,
        tatsaechliche_rueckgabe: form.tatsaechliche_rueckgabe || undefined,
        notizen: form.notizen || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateWerkzeugzuweisungEntry(record!.record_id, fields);
        toast.success('Zuweisung aktualisiert.');
      } else {
        await LivingAppsService.createWerkzeugzuweisungEntry(fields);
        toast.success('Zuweisung erstellt.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Zuweisung bearbeiten' : 'Neue Zuweisung'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere die Zuweisungsdaten.' : 'Weise einem Mitarbeiter ein Werkzeug zu.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Werkzeug *</Label>
            <Select value={form.werkzeug || 'none'} onValueChange={v => setForm(p => ({ ...p, werkzeug: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Werkzeug wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Auswahl</SelectItem>
                {werkzeuge.map(w => <SelectItem key={w.record_id} value={w.record_id}>{w.fields.werkzeugname || w.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mitarbeiter *</Label>
            <Select value={form.mitarbeiter || 'none'} onValueChange={v => setForm(p => ({ ...p, mitarbeiter: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Auswahl</SelectItem>
                {mitarbeiter.map(m => <SelectItem key={m.record_id} value={m.record_id}>{[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Projekt (optional)</Label>
            <Select value={form.projekt || 'none'} onValueChange={v => setForm(p => ({ ...p, projekt: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Projekt wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projekte.map(p => <SelectItem key={p.record_id} value={p.record_id}>{p.fields.projektname || p.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Zuweisungsdatum</Label>
              <Input type="date" value={form.zuweisungsdatum} onChange={e => setForm(p => ({ ...p, zuweisungsdatum: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Geplante Rückgabe</Label>
              <Input type="date" value={form.geplante_rueckgabe} onChange={e => setForm(p => ({ ...p, geplante_rueckgabe: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tatsächliche Rückgabe</Label>
            <Input type="date" value={form.tatsaechliche_rueckgabe} onChange={e => setForm(p => ({ ...p, tatsaechliche_rueckgabe: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Notizen</Label>
            <Textarea value={form.notizen} onChange={e => setForm(p => ({ ...p, notizen: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Erstellen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ZuweisungTab({
  zuweisungen, werkzeuge, mitarbeiter, projekte, onRefresh,
}: {
  zuweisungen: Werkzeugzuweisung[];
  werkzeuge: Werkzeuge[];
  mitarbeiter: Mitarbeiter[];
  projekte: Projekte[];
  onRefresh: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Werkzeugzuweisung | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Werkzeugzuweisung | null>(null);
  const wMap = useMemo(() => new Map(werkzeuge.map(w => [w.record_id, w])), [werkzeuge]);
  const mMap = useMemo(() => new Map(mitarbeiter.map(m => [m.record_id, m])), [mitarbeiter]);

  function resolveName(url: string | undefined, map: Map<string, { fields: { werkzeugname?: string; vorname?: string; nachname?: string } }>, type: 'w' | 'm'): string {
    if (!url) return '-';
    const id = extractRecordId(url);
    if (!id) return '-';
    const rec = map.get(id);
    if (!rec) return id.slice(0, 8) + '...';
    if (type === 'w') return rec.fields.werkzeugname || '-';
    return [rec.fields.vorname, rec.fields.nachname].filter(Boolean).join(' ') || '-';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Zuweisungen ({zuweisungen.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Werkzeug</TableHead>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead className="hidden sm:table-cell">Datum</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zuweisungen.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Noch keine Zuweisungen vorhanden.</TableCell></TableRow>
            ) : zuweisungen.map(z => {
              const returned = !!z.fields.tatsaechliche_rueckgabe;
              return (
                <TableRow key={z.record_id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{resolveName(z.fields.werkzeug, wMap as any, 'w')}</TableCell>
                  <TableCell>{resolveName(z.fields.mitarbeiter, mMap as any, 'm')}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(z.fields.zuweisungsdatum)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {returned
                      ? <Badge variant="outline" className="bg-green-50 text-green-700">Zurückgegeben</Badge>
                      : <Badge variant="outline" className="bg-amber-50 text-amber-700">Ausstehend</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditRecord(z)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(z)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ZuweisungDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} werkzeuge={werkzeuge} mitarbeiter={mitarbeiter} projekte={projekte} />
      <ZuweisungDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} werkzeuge={werkzeuge} mitarbeiter={mitarbeiter} projekte={projekte} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name="Zuweisung"
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteWerkzeugzuweisungEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

// ─── CRUD: Wartung ─────────────────────────────────────────────
function WartungDialog({
  open, onOpenChange, record, onSuccess, werkzeuge,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Wartung | null;
  onSuccess: () => void;
  werkzeuge: Werkzeuge[];
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    werkzeug: '', wartungsart: '' as string, wartungsdatum: todayStr(),
    beschreibung: '', kosten: '' as string | number,
    durchgefuehrt_von: '' as string, naechste_wartung: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        werkzeug: extractRecordId(record?.fields.werkzeug) ?? '',
        wartungsart: record?.fields.wartungsart ?? '',
        wartungsdatum: record?.fields.wartungsdatum?.split('T')[0] ?? todayStr(),
        beschreibung: record?.fields.beschreibung ?? '',
        kosten: record?.fields.kosten ?? '',
        durchgefuehrt_von: record?.fields.durchgefuehrt_von ?? '',
        naechste_wartung: record?.fields.naechste_wartung?.split('T')[0] ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Wartung['fields'] = {
        werkzeug: form.werkzeug ? createRecordUrl(APP_IDS.WERKZEUGE, form.werkzeug) : undefined,
        wartungsart: (form.wartungsart || undefined) as Wartung['fields']['wartungsart'],
        wartungsdatum: form.wartungsdatum || undefined,
        beschreibung: form.beschreibung || undefined,
        kosten: form.kosten !== '' ? Number(form.kosten) : undefined,
        durchgefuehrt_von: (form.durchgefuehrt_von || undefined) as Wartung['fields']['durchgefuehrt_von'],
        naechste_wartung: form.naechste_wartung || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateWartungEntry(record!.record_id, fields);
        toast.success('Wartung aktualisiert.');
      } else {
        await LivingAppsService.createWartungEntry(fields);
        toast.success('Wartung erstellt.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Wartung bearbeiten' : 'Neue Wartung'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere den Wartungseintrag.' : 'Erfasse eine neue Wartung.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Werkzeug *</Label>
            <Select value={form.werkzeug || 'none'} onValueChange={v => setForm(p => ({ ...p, werkzeug: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Werkzeug wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Auswahl</SelectItem>
                {werkzeuge.map(w => <SelectItem key={w.record_id} value={w.record_id}>{w.fields.werkzeugname || w.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Wartungsart *</Label>
              <Select value={form.wartungsart || 'none'} onValueChange={v => setForm(p => ({ ...p, wartungsart: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Art wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Auswahl</SelectItem>
                  {Object.entries(WARTUNGSART_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wartungsdatum</Label>
              <Input type="date" value={form.wartungsdatum} onChange={e => setForm(p => ({ ...p, wartungsdatum: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Textarea value={form.beschreibung} onChange={e => setForm(p => ({ ...p, beschreibung: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kosten (EUR)</Label>
              <Input type="number" step="0.01" value={form.kosten} onChange={e => setForm(p => ({ ...p, kosten: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Durchgeführt von</Label>
              <Select value={form.durchgefuehrt_von || 'none'} onValueChange={v => setForm(p => ({ ...p, durchgefuehrt_von: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Auswahl</SelectItem>
                  {Object.entries(DURCHGEFUEHRT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nächste Wartung fällig am</Label>
            <Input type="date" value={form.naechste_wartung} onChange={e => setForm(p => ({ ...p, naechste_wartung: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Erstellen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WartungTab({ wartung, werkzeuge, onRefresh }: { wartung: Wartung[]; werkzeuge: Werkzeuge[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Wartung | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Wartung | null>(null);
  const wMap = useMemo(() => new Map(werkzeuge.map(w => [w.record_id, w])), [werkzeuge]);

  function resolveWerkzeug(url: string | undefined): string {
    if (!url) return '-';
    const id = extractRecordId(url);
    if (!id) return '-';
    return wMap.get(id)?.fields.werkzeugname || id.slice(0, 8) + '...';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Wartung ({wartung.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Werkzeug</TableHead>
              <TableHead>Wartungsart</TableHead>
              <TableHead className="hidden sm:table-cell">Datum</TableHead>
              <TableHead className="hidden md:table-cell">Kosten</TableHead>
              <TableHead className="hidden md:table-cell">Nächste</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wartung.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Noch keine Wartungen vorhanden.</TableCell></TableRow>
            ) : wartung.map(w => (
              <TableRow key={w.record_id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{resolveWerkzeug(w.fields.werkzeug)}</TableCell>
                <TableCell>{w.fields.wartungsart ? WARTUNGSART_LABELS[w.fields.wartungsart] ?? w.fields.wartungsart : '-'}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(w.fields.wartungsdatum)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatCurrency(w.fields.kosten)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(w.fields.naechste_wartung)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditRecord(w)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(w)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <WartungDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} werkzeuge={werkzeuge} />
      <WartungDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} werkzeuge={werkzeuge} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name="Wartungseintrag"
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteWartungEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

// ─── CRUD: Werkzeugausgabe ─────────────────────────────────────
function AusgabeDialog({
  open, onOpenChange, record, onSuccess, werkzeuge, mitarbeiter, projekte,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: Werkzeugausgabe | null;
  onSuccess: () => void;
  werkzeuge: Werkzeuge[];
  mitarbeiter: Mitarbeiter[];
  projekte: Projekte[];
}) {
  const isEdit = !!record;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    mitarbeiter: '', werkzeuge: '', projekt: '',
    ausgabedatum: todayStr(), geplante_rueckgabe: '', notizen: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        mitarbeiter: extractRecordId(record?.fields.mitarbeiter) ?? '',
        werkzeuge: extractRecordId(record?.fields.werkzeuge) ?? '',
        projekt: extractRecordId(record?.fields.projekt) ?? '',
        ausgabedatum: record?.fields.ausgabedatum?.split('T')[0] ?? todayStr(),
        geplante_rueckgabe: record?.fields.geplante_rueckgabe?.split('T')[0] ?? '',
        notizen: record?.fields.notizen ?? '',
      });
    }
  }, [open, record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fields: Werkzeugausgabe['fields'] = {
        mitarbeiter: form.mitarbeiter ? createRecordUrl(APP_IDS.MITARBEITER, form.mitarbeiter) : undefined,
        werkzeuge: form.werkzeuge ? createRecordUrl(APP_IDS.WERKZEUGE, form.werkzeuge) : undefined,
        projekt: form.projekt ? createRecordUrl(APP_IDS.PROJEKTE, form.projekt) : undefined,
        ausgabedatum: form.ausgabedatum || undefined,
        geplante_rueckgabe: form.geplante_rueckgabe || undefined,
        notizen: form.notizen || undefined,
      };
      if (isEdit) {
        await LivingAppsService.updateWerkzeugausgabeEntry(record!.record_id, fields);
        toast.success('Ausgabe aktualisiert.');
      } else {
        await LivingAppsService.createWerkzeugausgabeEntry(fields);
        toast.success('Werkzeug ausgegeben.');
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(`Fehler beim ${isEdit ? 'Speichern' : 'Erstellen'}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ausgabe bearbeiten' : 'Werkzeug ausgeben'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Ändere die Ausgabedaten.' : 'Gib ein Werkzeug an einen Mitarbeiter aus.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Mitarbeiter *</Label>
            <Select value={form.mitarbeiter || 'none'} onValueChange={v => setForm(p => ({ ...p, mitarbeiter: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Auswahl</SelectItem>
                {mitarbeiter.map(m => <SelectItem key={m.record_id} value={m.record_id}>{[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Werkzeug *</Label>
            <Select value={form.werkzeuge || 'none'} onValueChange={v => setForm(p => ({ ...p, werkzeuge: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Werkzeug wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Auswahl</SelectItem>
                {werkzeuge.map(w => <SelectItem key={w.record_id} value={w.record_id}>{w.fields.werkzeugname || w.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Projekt (optional)</Label>
            <Select value={form.projekt || 'none'} onValueChange={v => setForm(p => ({ ...p, projekt: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Projekt wählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projekte.map(p => <SelectItem key={p.record_id} value={p.record_id}>{p.fields.projektname || p.record_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ausgabedatum</Label>
              <Input type="date" value={form.ausgabedatum} onChange={e => setForm(p => ({ ...p, ausgabedatum: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Geplante Rückgabe</Label>
              <Input type="date" value={form.geplante_rueckgabe} onChange={e => setForm(p => ({ ...p, geplante_rueckgabe: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notizen</Label>
            <Textarea value={form.notizen} onChange={e => setForm(p => ({ ...p, notizen: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Speichert...' : isEdit ? 'Speichern' : 'Ausgeben'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AusgabeTab({
  ausgaben, werkzeuge, mitarbeiter, projekte, onRefresh,
}: {
  ausgaben: Werkzeugausgabe[];
  werkzeuge: Werkzeuge[];
  mitarbeiter: Mitarbeiter[];
  projekte: Projekte[];
  onRefresh: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Werkzeugausgabe | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<Werkzeugausgabe | null>(null);
  const wMap = useMemo(() => new Map(werkzeuge.map(w => [w.record_id, w])), [werkzeuge]);
  const mMap = useMemo(() => new Map(mitarbeiter.map(m => [m.record_id, m])), [mitarbeiter]);

  function resolve(url: string | undefined, map: Map<string, any>, type: 'w' | 'm'): string {
    if (!url) return '-';
    const id = extractRecordId(url);
    if (!id) return '-';
    const rec = map.get(id);
    if (!rec) return id.slice(0, 8) + '...';
    if (type === 'w') return rec.fields.werkzeugname || '-';
    return [rec.fields.vorname, rec.fields.nachname].filter(Boolean).join(' ') || '-';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Werkzeugausgaben ({ausgaben.length})</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Neu</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Werkzeug</TableHead>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead className="hidden sm:table-cell">Ausgabedatum</TableHead>
              <TableHead className="hidden md:table-cell">Gepl. Rückgabe</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ausgaben.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Noch keine Ausgaben vorhanden.</TableCell></TableRow>
            ) : ausgaben.map(a => (
              <TableRow key={a.record_id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{resolve(a.fields.werkzeuge, wMap, 'w')}</TableCell>
                <TableCell>{resolve(a.fields.mitarbeiter, mMap, 'm')}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(a.fields.ausgabedatum)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(a.fields.geplante_rueckgabe)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditRecord(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(a)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AusgabeDialog open={createOpen} onOpenChange={setCreateOpen} record={null} onSuccess={onRefresh} werkzeuge={werkzeuge} mitarbeiter={mitarbeiter} projekte={projekte} />
      <AusgabeDialog open={!!editRecord} onOpenChange={v => !v && setEditRecord(null)} record={editRecord} onSuccess={onRefresh} werkzeuge={werkzeuge} mitarbeiter={mitarbeiter} projekte={projekte} />
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onOpenChange={v => !v && setDeleteRecord(null)}
        name="Ausgabe"
        onConfirm={async () => { if (deleteRecord) await LivingAppsService.deleteWerkzeugausgabeEntry(deleteRecord.record_id); setDeleteRecord(null); onRefresh(); }}
      />
    </div>
  );
}

// ─── Dashboard Overview ────────────────────────────────────────
function DashboardOverview({
  werkzeuge, zuweisungen, wartung, ausgaben,
  werkzeugeMap, mitarbeiterMap,
  onOpenAusgabe,
}: {
  werkzeuge: Werkzeuge[];
  zuweisungen: Werkzeugzuweisung[];
  wartung: Wartung[];
  ausgaben: Werkzeugausgabe[];
  werkzeugeMap: Map<string, Werkzeuge>;
  mitarbeiterMap: Map<string, Mitarbeiter>;
  onOpenAusgabe: () => void;
}) {
  const today = new Date();
  const todayS = format(today, 'yyyy-MM-dd');

  // Checked-out tool IDs (ausgaben without corresponding return in zuweisungen)
  const checkedOutToolIds = useMemo(() => {
    const returnedToolIds = new Set<string>();
    zuweisungen.forEach(z => {
      if (z.fields.tatsaechliche_rueckgabe) {
        const wId = extractRecordId(z.fields.werkzeug);
        if (wId) returnedToolIds.add(wId);
      }
    });
    const outIds = new Set<string>();
    ausgaben.forEach(a => {
      const wId = extractRecordId(a.fields.werkzeuge);
      if (wId) outIds.add(wId);
    });
    return outIds;
  }, [ausgaben, zuweisungen]);

  const totalTools = werkzeuge.length;
  const availableTools = totalTools - checkedOutToolIds.size;

  // Total inventory value
  const totalValue = useMemo(() =>
    werkzeuge.reduce((sum, w) => sum + (w.fields.kaufpreis ?? 0), 0),
    [werkzeuge]
  );

  // Maintenance costs this year
  const currentYear = today.getFullYear().toString();
  const maintenanceCosts = useMemo(() =>
    wartung
      .filter(w => w.fields.wartungsdatum?.startsWith(currentYear))
      .reduce((sum, w) => sum + (w.fields.kosten ?? 0), 0),
    [wartung, currentYear]
  );

  // Average checkout duration
  const avgDuration = useMemo(() => {
    const durations: number[] = [];
    zuweisungen.forEach(z => {
      if (z.fields.zuweisungsdatum && z.fields.tatsaechliche_rueckgabe) {
        const days = differenceInDays(
          parseISO(z.fields.tatsaechliche_rueckgabe.split('T')[0]),
          parseISO(z.fields.zuweisungsdatum.split('T')[0])
        );
        if (days >= 0) durations.push(days);
      }
    });
    return durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  }, [zuweisungen]);

  // Tools needing repair
  const repairCount = useMemo(() =>
    werkzeuge.filter(w => w.fields.zustand === 'reparaturbeduerftig' || w.fields.zustand === 'defekt').length,
    [werkzeuge]
  );

  // Overdue returns
  const overdueItems = useMemo(() => {
    const items: Array<{ type: 'overdue'; tool: string; person: string; days: number; record: Werkzeugzuweisung }> = [];
    zuweisungen.forEach(z => {
      if (!z.fields.tatsaechliche_rueckgabe && z.fields.geplante_rueckgabe) {
        const plannedDate = z.fields.geplante_rueckgabe.split('T')[0];
        if (plannedDate < todayS) {
          const days = differenceInDays(today, parseISO(plannedDate));
          const toolId = extractRecordId(z.fields.werkzeug);
          const personId = extractRecordId(z.fields.mitarbeiter);
          items.push({
            type: 'overdue',
            tool: toolId ? werkzeugeMap.get(toolId)?.fields.werkzeugname || 'Unbekannt' : 'Unbekannt',
            person: personId ? [mitarbeiterMap.get(personId)?.fields.vorname, mitarbeiterMap.get(personId)?.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt' : 'Unbekannt',
            days,
            record: z,
          });
        }
      }
    });
    return items.sort((a, b) => b.days - a.days);
  }, [zuweisungen, todayS, today, werkzeugeMap, mitarbeiterMap]);

  // Upcoming maintenance
  const upcomingMaintenance = useMemo(() => {
    const items: Array<{ type: 'maintenance'; tool: string; art: string; days: number }> = [];
    const in14days = format(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    wartung.forEach(w => {
      if (w.fields.naechste_wartung) {
        const next = w.fields.naechste_wartung.split('T')[0];
        if (next >= todayS && next <= in14days) {
          const days = differenceInDays(parseISO(next), today);
          const toolId = extractRecordId(w.fields.werkzeug);
          items.push({
            type: 'maintenance',
            tool: toolId ? werkzeugeMap.get(toolId)?.fields.werkzeugname || 'Unbekannt' : 'Unbekannt',
            art: w.fields.wartungsart ? WARTUNGSART_LABELS[w.fields.wartungsart] || w.fields.wartungsart : '',
            days,
          });
        }
      }
    });
    return items.sort((a, b) => a.days - b.days);
  }, [wartung, todayS, today, werkzeugeMap]);

  // Chart: Tools by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    werkzeuge.forEach(w => {
      const cat = w.fields.kategorie || 'sonstiges';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([key, count]) => ({
      name: KATEGORIE_LABELS[key] || key,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [werkzeuge]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return ausgaben
      .filter(a => a.fields.ausgabedatum)
      .sort((a, b) => (b.fields.ausgabedatum || '').localeCompare(a.fields.ausgabedatum || ''))
      .slice(0, 6)
      .map(a => {
        const toolId = extractRecordId(a.fields.werkzeuge);
        const personId = extractRecordId(a.fields.mitarbeiter);
        return {
          tool: toolId ? werkzeugeMap.get(toolId)?.fields.werkzeugname || 'Werkzeug' : 'Werkzeug',
          person: personId ? [mitarbeiterMap.get(personId)?.fields.vorname, mitarbeiterMap.get(personId)?.fields.nachname].filter(Boolean).join(' ') || 'Mitarbeiter' : 'Mitarbeiter',
          date: a.fields.ausgabedatum || '',
          relative: a.fields.ausgabedatum
            ? formatDistance(parseISO(a.fields.ausgabedatum.split('T')[0]), today, { addSuffix: true, locale: de })
            : '',
        };
      });
  }, [ausgaben, werkzeugeMap, mitarbeiterMap, today]);

  const urgentItems = [...overdueItems.slice(0, 5), ...upcomingMaintenance.slice(0, 3)];
  const chartColors = ['hsl(28 90% 52%)', 'hsl(175 55% 40%)', 'hsl(215 25% 45%)', 'hsl(45 85% 55%)', 'hsl(0 72% 51%)', 'hsl(28 70% 65%)', 'hsl(175 40% 55%)', 'hsl(215 20% 60%)'];

  return (
    <div className="space-y-6">
      {/* Mobile: Primary action fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/95 backdrop-blur border-t md:hidden">
        <Button className="w-full h-12 text-base font-semibold" onClick={onOpenAusgabe}>
          <Package className="h-5 w-5 mr-2" />
          Werkzeug ausgeben
        </Button>
      </div>

      {/* Desktop layout: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Hero + KPIs row */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
            {/* Hero Gauge */}
            <Card className="flex items-center justify-center py-6 px-4 hover:shadow-md transition-shadow">
              <AvailabilityGauge available={availableTools} total={totalTools} size={260} />
            </Card>

            {/* 2x2 KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Gesamtwert</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalValue)}</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Wartungskosten {currentYear}</CardTitle>
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold tracking-tight">{formatCurrency(maintenanceCosts)}</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Durchschn. Ausleihe</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold tracking-tight">{avgDuration} <span className="text-base font-normal text-muted-foreground">Tage</span></div>
                </CardContent>
              </Card>
              <Card className={`hover:shadow-md transition-shadow ${repairCount > 0 ? 'border-destructive/30' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">In Reparatur</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold tracking-tight ${repairCount > 0 ? 'text-destructive' : ''}`}>{repairCount}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile alert badges */}
          <div className="flex flex-wrap gap-2 md:hidden">
            {overdueItems.length > 0 && (
              <Badge variant="destructive" className="text-xs">{overdueItems.length} überfällig</Badge>
            )}
            {upcomingMaintenance.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">{upcomingMaintenance.length} Wartung fällig</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{checkedOutToolIds.size} ausgegeben</Badge>
          </div>

          {/* Chart */}
          {categoryData.length > 0 && (
            <Card className="hidden md:block hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Werkzeuge nach Kategorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215 12% 50%)" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(215 12% 50%)" width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(0 0% 100%)',
                          border: '1px solid hsl(210 15% 89%)',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                        formatter={(value: number) => [`${value} Stück`, 'Anzahl']}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile: Urgent actions */}
          <div className="md:hidden space-y-3">
            {urgentItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Dringende Aktionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {urgentItems.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.type === 'overdue'
                          ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          : <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                        <span className="text-sm font-medium truncate">{item.tool}</span>
                      </div>
                      <span className={`text-xs whitespace-nowrap ml-2 ${item.type === 'overdue' ? 'text-destructive' : 'text-amber-600'}`}>
                        {item.type === 'overdue' ? `${(item as any).days}d überfällig` : `in ${(item as any).days}d`}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Mobile: Recent activity */}
            {recentActivity.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Letzte Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {recentActivity.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{a.tool}</span>
                        <span className="text-muted-foreground text-sm"> → {a.person}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{a.relative}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right column (desktop only) */}
        <div className="hidden lg:block space-y-6">
          {/* Urgent actions */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Dringende Aktionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueItems.length === 0 && upcomingMaintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Keine dringenden Aktionen.</p>
              ) : (
                <div className="space-y-1">
                  {overdueItems.slice(0, 5).map((item, i) => (
                    <div key={`o-${i}`} className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.tool}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.person}</div>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs shrink-0 ml-2">{item.days}d</Badge>
                    </div>
                  ))}
                  {upcomingMaintenance.slice(0, 3).map((item, i) => (
                    <div key={`m-${i}`} className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.tool}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.art}</div>
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs shrink-0 ml-2">in {item.days}d</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Letzte Aktivitäten
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Aktivitäten.</p>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 border-b last:border-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.tool}</div>
                        <div className="text-xs text-muted-foreground truncate">→ {a.person}</div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{a.relative}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Spacer for mobile fixed button */}
      <div className="h-16 md:hidden" />
    </div>
  );
}

// ─── Loading State ─────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            <Skeleton className="h-[200px] rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[100px] rounded-lg" />
              <Skeleton className="h-[100px] rounded-lg" />
              <Skeleton className="h-[100px] rounded-lg" />
              <Skeleton className="h-[100px] rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[250px] rounded-lg" />
          <Skeleton className="h-[250px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Fehler beim Laden</h2>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{error.message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Erneut versuchen
      </Button>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [werkzeuge, setWerkzeuge] = useState<Werkzeuge[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [projekte, setProjekte] = useState<Projekte[]>([]);
  const [zuweisungen, setZuweisungen] = useState<Werkzeugzuweisung[]>([]);
  const [wartung, setWartung] = useState<Wartung[]>([]);
  const [ausgaben, setAusgaben] = useState<Werkzeugausgabe[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ausgabeDialogOpen, setAusgabeDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [w, m, p, z, wa, au] = await Promise.all([
        LivingAppsService.getWerkzeuge(),
        LivingAppsService.getMitarbeiter(),
        LivingAppsService.getProjekte(),
        LivingAppsService.getWerkzeugzuweisung(),
        LivingAppsService.getWartung(),
        LivingAppsService.getWerkzeugausgabe(),
      ]);
      setWerkzeuge(w);
      setMitarbeiter(m);
      setProjekte(p);
      setZuweisungen(z);
      setWartung(wa);
      setAusgaben(au);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const werkzeugeMap = useMemo(() => new Map(werkzeuge.map(w => [w.record_id, w])), [werkzeuge]);
  const mitarbeiterMap = useMemo(() => new Map(mitarbeiter.map(m => [m.record_id, m])), [mitarbeiter]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchAll} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Toaster */}
      <div className="max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Werkzeugverwaltung</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Elektrobetrieb Dashboard</p>
          </div>
          <Button className="hidden md:flex" onClick={() => setAusgabeDialogOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Werkzeug ausgeben
          </Button>
        </div>

        {/* Navigation tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="werkzeuge" className="text-xs sm:text-sm">Werkzeuge</TabsTrigger>
              <TabsTrigger value="mitarbeiter" className="text-xs sm:text-sm">Mitarbeiter</TabsTrigger>
              <TabsTrigger value="projekte" className="text-xs sm:text-sm">Projekte</TabsTrigger>
              <TabsTrigger value="zuweisungen" className="text-xs sm:text-sm">Zuweisungen</TabsTrigger>
              <TabsTrigger value="wartung" className="text-xs sm:text-sm">Wartung</TabsTrigger>
              <TabsTrigger value="ausgaben" className="text-xs sm:text-sm">Ausgaben</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <DashboardOverview
              werkzeuge={werkzeuge}
              zuweisungen={zuweisungen}
              wartung={wartung}
              ausgaben={ausgaben}
              werkzeugeMap={werkzeugeMap}
              mitarbeiterMap={mitarbeiterMap}
              onOpenAusgabe={() => setAusgabeDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="werkzeuge">
            <WerkzeugeTab werkzeuge={werkzeuge} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="mitarbeiter">
            <MitarbeiterTab mitarbeiter={mitarbeiter} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="projekte">
            <ProjekteTab projekte={projekte} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="zuweisungen">
            <ZuweisungTab
              zuweisungen={zuweisungen}
              werkzeuge={werkzeuge}
              mitarbeiter={mitarbeiter}
              projekte={projekte}
              onRefresh={fetchAll}
            />
          </TabsContent>

          <TabsContent value="wartung">
            <WartungTab wartung={wartung} werkzeuge={werkzeuge} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="ausgaben">
            <AusgabeTab
              ausgaben={ausgaben}
              werkzeuge={werkzeuge}
              mitarbeiter={mitarbeiter}
              projekte={projekte}
              onRefresh={fetchAll}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Global Ausgabe Dialog (accessible from header button and mobile FAB) */}
      <AusgabeDialog
        open={ausgabeDialogOpen}
        onOpenChange={setAusgabeDialogOpen}
        record={null}
        onSuccess={fetchAll}
        werkzeuge={werkzeuge}
        mitarbeiter={mitarbeiter}
        projekte={projekte}
      />
    </div>
  );
}
