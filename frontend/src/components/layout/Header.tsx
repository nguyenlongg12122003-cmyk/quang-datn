import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ShoppingCart, Heart, User, Search, Menu, ChevronDown, LogOut, Package, Settings, Building2, Sparkles, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { IconRenderer } from '@/components/ui/icon-renderer';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { catalogApi, type Category } from '@/lib/api-service';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore(s => s.getItemCount());
  const wishlistCount = useWishlistStore(s => s.productIds.length);

  useEffect(() => { catalogApi.getCategories().then(setCategories).catch(() => {}); }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length > 1) {
      catalogApi.getProducts({ q: value, limit: 5 })
        .then(prods => { setSuggestions(prods.map(p => p.name)); setShowSuggestions(true); })
        .catch(() => {});
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (query?: string) => {
    const q = query || searchQuery;
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setShowSuggestions(false);
      setSearchQuery(q);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      {/* Main header */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="py-4">
                <h3 className="font-semibold mb-4 text-lg">Danh mục sản phẩm</h3>
                <nav className="space-y-2">
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-foreground"
                    >
                      <IconRenderer name={cat.icon ?? ''} className="h-4 w-4" />
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                </nav>
                <div className="border-t mt-4 pt-4 space-y-2">
                  <Link to="/vouchers" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-foreground"><Ticket className="h-4 w-4" /> Mã giảm giá</Link>
                  <Link to="/wholesale" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-foreground"><Building2 className="h-4 w-4" /> Mua sỉ</Link>
                  <Link to="/customize" className="flex items-center gap-2 p-2 hover:bg-accent rounded-md text-foreground"><Sparkles className="h-4 w-4" /> Tùy chỉnh sản phẩm</Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="QuangVPP logo" className="h-10 w-10 rounded-lg object-cover" />
            <div className="hidden sm:block">
              <div className="font-bold text-lg text-foreground leading-tight">QuangVPP</div>
              <div className="text-xs text-muted-foreground">Văn phòng phẩm</div>
            </div>
          </Link>

          {/* Category dropdown - desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden lg:flex gap-1">
                <Menu className="h-4 w-4" />
                Danh mục
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {categories.map(cat => (
                <DropdownMenuItem key={cat.id} asChild>
                  <Link to={`/category/${cat.slug ?? cat.id}`} className="flex items-center gap-2">
                      <IconRenderer name={cat.icon ?? ''} className="h-4 w-4" />
                    <span>{cat.name}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{cat.productCount}</Badge>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/wholesale" className="hidden xl:block">
            <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
              <Building2 className="h-4 w-4" /> Mua sỉ
            </Button>
          </Link>

          <Link to="/vouchers" className="hidden xl:block">
            <Button variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
              <Ticket className="h-4 w-4" /> Mã giảm giá
            </Button>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-xl relative">
            <div className="flex">
              <Input
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="rounded-r-none"
              />
              <Button onClick={() => handleSearch()} className="rounded-l-none">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {/* Search suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-b-md shadow-lg z-50 mt-0.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2"
                    onMouseDown={() => handleSearch(s)}
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link to="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full" />
                    <span className="hidden md:inline text-sm">{user.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Tài khoản
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Đơn hàng
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-vouchers" className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" /> Voucher của tôi
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Quản trị
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Đăng nhập</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
