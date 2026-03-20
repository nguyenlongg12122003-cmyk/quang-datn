import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Tag, Grid3X3, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { catalogApi, type Category, type Brand } from '@/lib/api-service';
import { toast } from 'sonner';

// Lucide icon options for categories
const ICON_OPTIONS = [
  'PenTool', 'BookOpen', 'Paperclip', 'Folder', 'Scissors', 'Printer',
  'Archive', 'Tag', 'Box', 'Package', 'ShoppingBag', 'Layers', 'Grid3X3',
  'Star', 'Gift', 'Palette', 'Stamp', 'Pen', 'FileText', 'Clipboard', 'Brush',
];

function CategoryManager() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    catalogApi.getCategories().then(setItems).catch(() => toast.error('Lỗi tải danh mục')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', slug: '', icon: 'Tag', description: '' }); setShowDialog(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', description: c.description ?? '' }); setShowDialog(true); };

  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const handleSave = async () => {
    if (!form.name) { toast.error('Vui lòng nhập tên danh mục'); return; }
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    setSaving(true);
    try {
      if (editing) { await catalogApi.updateCategory(editing.id, payload); toast.success('Đã cập nhật danh mục!'); }
      else { await catalogApi.createCategory(payload); toast.success('Đã thêm danh mục!'); }
      setShowDialog(false); load();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lỗi lưu danh mục');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa danh mục "${name}"? Các sản phẩm thuộc danh mục này sẽ không bị xóa.`)) return;
    try { await catalogApi.deleteCategory(id); toast.success('Đã xóa'); load(); }
    catch { toast.error('Lỗi xóa danh mục'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold">Danh mục sản phẩm</h3><p className="text-sm text-muted-foreground">{items.length} danh mục</p></div>
        <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Thêm danh mục</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên danh mục</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead className="text-center">Số SP</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cat.slug}</TableCell>
                    <TableCell><Badge variant="outline">{cat.icon || '—'}</Badge></TableCell>
                    <TableCell className="text-center">{cat.productCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(cat.id, cat.name)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Không có danh mục nào</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tên danh mục *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) }))} placeholder="VD: Bút bi" /></div>
            <div className="space-y-2"><Label>Slug (URL)</Label><Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="but-bi" /></div>
            <div className="space-y-2">
              <Label>Icon (chọn từ danh sách)</Label>
              <div className="flex gap-2 flex-wrap border rounded-lg p-2 max-h-28 overflow-y-auto">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(p => ({ ...p, icon }))}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${form.icon === icon ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent border-transparent'}`}>
                    {icon}
                  </button>
                ))}
              </div>
              <Input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="Hoặc nhập tên icon Lucide..." />
            </div>
            <div className="space-y-2"><Label>Mô tả</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}><X className="h-4 w-4 mr-1" />Hủy</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Lưu</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandManager() {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', logo: '' });
  const [saving, setSaving] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    catalogApi.getBrands().then(setItems).catch(() => toast.error('Lỗi tải thương hiệu')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', logo: '' }); setShowDialog(true); };
  const openEdit = (b: Brand) => { setEditing(b); setForm({ name: b.name, logo: b.logo ?? '' }); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Vui lòng nhập tên thương hiệu'); return; }
    setSaving(true);
    try {
      if (editing) { await catalogApi.updateBrand(editing.id, form); toast.success('Đã cập nhật thương hiệu!'); }
      else { await catalogApi.createBrand(form); toast.success('Đã thêm thương hiệu!'); }
      setShowDialog(false); load();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lỗi lưu thương hiệu');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa thương hiệu "${name}"?`)) return;
    try { await catalogApi.deleteBrand(id); toast.success('Đã xóa'); load(); }
    catch { toast.error('Lỗi xóa thương hiệu'); }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setForm(p => ({ ...p, logo: result }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold">Thương hiệu</h3><p className="text-sm text-muted-foreground">{items.length} thương hiệu</p></div>
        <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Thêm thương hiệu</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Tên thương hiệu</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(brand => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-8 w-16 object-contain" /> : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(brand)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(brand.id, brand.name)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Không có thương hiệu nào</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tên thương hiệu *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: Thiên Long" /></div>
            <div className="space-y-2">
              <Label>Logo thương hiệu</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => logoFileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> Tải ảnh logo
                </Button>
                {form.logo && (
                  <Button type="button" variant="ghost" className="text-red-500" onClick={() => setForm(p => ({ ...p, logo: '' }))}>
                    Xóa logo
                  </Button>
                )}
              </div>
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              {form.logo && <img src={form.logo} alt="preview" className="h-12 object-contain border rounded p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              <p className="text-xs text-muted-foreground">Hỗ trợ tải ảnh trực tiếp, không cần nhập URL.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}><X className="h-4 w-4 mr-1" />Hủy</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Lưu</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminCategories() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Danh mục & Thương hiệu</h2>
        <p className="text-sm text-muted-foreground">Quản lý danh mục sản phẩm và thương hiệu</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> Danh mục</TabsTrigger>
          <TabsTrigger value="brands" className="gap-2"><Grid3X3 className="h-4 w-4" /> Thương hiệu</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4"><CategoryManager /></TabsContent>
        <TabsContent value="brands" className="mt-4"><BrandManager /></TabsContent>
      </Tabs>
    </div>
  );
}
