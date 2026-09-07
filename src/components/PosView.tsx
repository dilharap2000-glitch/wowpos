import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Package,
  History,
  Plus,
  Search,
  Barcode,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  X,
  CreditCard,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Tag,
  Eye,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Product, Sale, Member } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface CartItem {
  product: Product;
  quantity: number;
}

interface PosViewProps {
  initialTab?: 'pos' | 'products' | 'history';
}

export const PosView: React.FC<PosViewProps> = ({ initialTab = 'pos' }) => {
  const { business, formatCurrency } = useBusiness();
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'history'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('Rs.');
  const [gymName, setGymName] = useState('Gym Management');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for training with us!');

  const activeCurrency = business.currency || currency;
  const activeGymName = business.gymName || gymName;
  const activeReceiptFooter = business.receiptFooter || receiptFooter;

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [completingSale, setCompletingSale] = useState(false);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockChangeQuantity, setStockChangeQuantity] = useState<number>(10);
  const [stockChangeNotes, setStockChangeNotes] = useState('Stock replenishment');
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [refundModalSale, setRefundModalSale] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer returned item');
  const [refunding, setRefunding] = useState(false);

  // New Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Supplements');
  const [newProdCostPrice, setNewProdCostPrice] = useState(1000);
  const [newProdSellingPrice, setNewProdSellingPrice] = useState(1500);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdMinAlert, setNewProdMinAlert] = useState(5);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [prodList, salesList, membersList, settingsMap] = await Promise.all([
        api.getProducts(),
        api.getSales({ limit: 100 }),
        api.getMembers(),
        api.getSettings(),
      ]);
      setProducts(prodList || []);
      setSales(salesList || []);
      setMembers(membersList || []);
      if (settingsMap) {
        if (settingsMap.currency) setCurrency(settingsMap.currency);
        if (settingsMap.gym_name) setGymName(settingsMap.gym_name);
        if (settingsMap.receipt_footer) setReceiptFooter(settingsMap.receipt_footer);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (prod: Product) => {
    if (prod.stockQuantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stockQuantity) return prev; // max stock limit
        return prev.map((item) =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQ = item.quantity + delta;
            if (nextQ <= 0) return null;
            if (nextQ > item.product.stockQuantity) return item;
            return { ...item, quantity: nextQ };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setSelectedMemberId(null);
  };

  // Barcode quick scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const clean = barcodeInput.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.name.toLowerCase() === clean
    );
    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product found with barcode "${barcodeInput}"`);
    }
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const cartFinalTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - (Number(discount) || 0));
  }, [cartSubtotal, discount]);

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCompletingSale(true);

    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        sellingPrice: item.product.sellingPrice,
        costPrice: item.product.costPrice,
      }));

      const res = await api.createSale({
        memberId: selectedMemberId,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || null,
        items: itemsPayload,
        discount: Number(discount) || 0,
        paymentMethod,
      });

      // Show receipt modal
      const completedSale: Sale = {
        ...res.sale,
        items: res.items,
        createdAt: new Date().toISOString(),
      };
      setActiveReceiptSale(completedSale);

      // Refresh inventory & sales
      clearCart();
      const [updatedProds, updatedSales] = await Promise.all([api.getProducts(), api.getSales()]);
      setProducts(updatedProds);
      setSales(updatedSales);
    } catch (err: any) {
      alert(err.message || 'Failed to complete sale');
    } finally {
      setCompletingSale(false);
    }
  };

  // Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addProduct({
        name: newProdName,
        barcode: newProdBarcode,
        category: newProdCategory,
        costPrice: newProdCostPrice,
        sellingPrice: newProdSellingPrice,
        stockQuantity: newProdStock,
        minStockAlert: newProdMinAlert,
      });
      setShowAddProductModal(false);
      // Reset form
      setNewProdName('');
      setNewProdBarcode('');
      setNewProdCostPrice(1000);
      setNewProdSellingPrice(1500);
      setNewProdStock(10);
      // Reload
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (err: any) {
      alert(err.message || 'Error creating product');
    }
  };

  // Edit Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.editProduct(editingProduct.id, {
        name: editingProduct.name,
        barcode: editingProduct.barcode,
        category: editingProduct.category,
        costPrice: editingProduct.costPrice,
        sellingPrice: editingProduct.sellingPrice,
        stockQuantity: editingProduct.stockQuantity,
        minStockAlert: editingProduct.minStockAlert,
      });
      setEditingProduct(null);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (err: any) {
      alert(err.message || 'Error updating product');
    }
  };

  // Restock / Stock Adjustment
  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      await api.adjustProductStock(adjustingProduct.id, {
        quantityChange: Number(stockChangeQuantity),
        changeType: 'restock',
        notes: stockChangeNotes,
      });
      setAdjustingProduct(null);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (err: any) {
      alert(err.message || 'Error adjusting stock');
    }
  };

  // Refund Sale
  const handleExecuteRefund = async () => {
    if (!refundModalSale) return;
    setRefunding(true);
    try {
      await api.refundSale(refundModalSale.id, refundReason);
      setRefundModalSale(null);
      const [updatedProds, updatedSales] = await Promise.all([api.getProducts(), api.getSales()]);
      setProducts(updatedProds);
      setSales(updatedSales);
    } catch (err: any) {
      alert(err.message || 'Failed to refund sale');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-950/60 border border-purple-500/30 text-purple-400 rounded-lg">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">POS & SALES REGISTER</h1>
            <p className="text-xs text-zinc-400">
              Direct checkout, product catalog, stock tracking, and receipt printing
            </p>
          </div>
        </div>

        <div className="flex items-center bg-black/40 border border-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Cash Register
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Products & Stock ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Sales History ({sales.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POS CASH REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection & Catalog (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Barcode Scan Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search products or supplements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <form onSubmit={handleBarcodeSubmit} className="relative">
                <Barcode className="w-4 h-4 text-purple-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Scan barcode & press Enter..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-purple-900/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </form>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0;
                const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-zinc-950/50 border-zinc-900 opacity-60 cursor-not-allowed'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-950/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                          {p.category}
                        </span>
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-950 text-red-400 border border-red-800/50 rounded">
                            OUT
                          </span>
                        ) : isLowStock ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50 rounded">
                            {p.stockQuantity} LEFT
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">
                            {p.stockQuantity} in stock
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 line-clamp-2">
                        {p.name}
                      </h3>
                      {p.barcode && (
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {p.barcode}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-400">
                        {currency} {p.sellingPrice.toLocaleString()}
                      </span>
                      <button
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isOutOfStock
                            ? 'bg-zinc-800 text-zinc-600'
                            : 'bg-purple-600/30 text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No products found matching your filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Cart & Checkout (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl shadow-black">
            {/* Cart Header */}
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Current Order
                </h2>
                <span className="px-2 py-0.5 text-xs bg-purple-950 border border-purple-800 text-purple-300 rounded-full font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Customer & Member Association */}
            <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/80 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold uppercase">
                    Customer / Member
                  </label>
                  <select
                    value={selectedMemberId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedMemberId(val);
                      if (val) {
                        const m = members.find((mem) => mem.id === val);
                        if (m) {
                          setCustomerName(m.fullName);
                          setCustomerPhone(m.phone);
                        }
                      } else {
                        setCustomerName('Walk-in Customer');
                        setCustomerPhone('');
                      }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Walk-in Customer</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        #{m.memberNumber} - {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold uppercase">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Cart Itemized List */}
            <div className="flex-1 p-3 overflow-y-auto max-h-[300px] space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-sm"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-semibold text-white truncate text-xs">
                      {item.product.name}
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {currency} {item.product.sellingPrice.toLocaleString()} each
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="px-2 py-0.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold text-white min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="px-2 py-0.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs font-bold text-amber-400 min-w-[65px] text-right">
                      {currency} {(item.product.sellingPrice * item.quantity).toLocaleString()}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-12 text-center text-zinc-500">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Cart is empty. Click products to add.</p>
                </div>
              )}
            </div>

            {/* Financial Summary & Checkout Controls */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
              {/* Payment Method Selector */}
              <div>
                <label className="text-[10px] text-zinc-400 font-semibold uppercase mb-1 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'bank_transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 px-2 text-xs font-bold rounded border transition-all capitalize ${
                        paymentMethod === m
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount and Subtotal breakdown */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>
                    {currency} {cartSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Discount ({currency})</span>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-24 bg-zinc-900 border border-zinc-800 text-right px-2 py-0.5 rounded text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                  <span>Total Amount</span>
                  <span className="text-amber-400">
                    {currency} {cartFinalTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Primary Action Button: Yellow/Gold per design preference */}
              <button
                disabled={cart.length === 0 || completingSale}
                onClick={handleCheckout}
                className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
                  cart.length === 0 || completingSale
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20 active:scale-[0.98]'
                }`}
              >
                {completingSale ? (
                  <>Processing Sale...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Sale • {currency} {cartFinalTotal.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCTS & STOCK INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products by name or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors self-start shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Barcode</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Cost Price</th>
                    <th className="p-3.5">Selling Price</th>
                    <th className="p-3.5">Stock Quantity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredProducts.map((p) => {
                    const isLow = p.stockQuantity <= p.minStockAlert;
                    const isOut = p.stockQuantity <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 font-semibold text-white">
                          {p.name}
                        </td>
                        <td className="p-3.5 font-mono text-xs text-zinc-400">
                          {p.barcode || '—'}
                        </td>
                        <td className="p-3.5 text-xs text-purple-300 capitalize">
                          {p.category}
                        </td>
                        <td className="p-3.5 text-zinc-400 text-xs">
                          {currency} {p.costPrice.toLocaleString()}
                        </td>
                        <td className="p-3.5 font-bold text-amber-400">
                          {currency} {p.sellingPrice.toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                              isOut
                                ? 'bg-red-950/80 text-red-400 border border-red-800'
                                : isLow
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : `${p.stockQuantity} in stock`}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setAdjustingProduct(p);
                              setStockChangeQuantity(10);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/50 rounded transition-colors"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="px-2.5 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES HISTORY & REFUNDS */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Items</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Total Paid</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Receipt / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3.5 font-mono text-xs font-bold text-purple-400">
                        {s.saleNumber}
                      </td>
                      <td className="p-3.5 text-xs text-zinc-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-medium text-white">
                        {s.customerName}
                        {s.customerPhone && (
                          <div className="text-[11px] text-zinc-500">{s.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-zinc-400">
                        {s.items?.length || 1} product(s)
                      </td>
                      <td className="p-3.5 text-xs capitalize font-medium text-zinc-300">
                        {s.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {currency} {s.finalAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-red-950 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setActiveReceiptSale(s)}
                          className="px-2.5 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        {s.status === 'completed' && (
                          <button
                            onClick={() => {
                              setRefundModalSale(s);
                              setRefundReason('Customer returned item');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 rounded transition-colors"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PRODUCT */}
      {/* ========================================================================= */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl shadow-purple-950/30">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Add New Gym Product
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Optimum Nutrition Gold Standard Whey 2kg"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Barcode / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PROD-WHEY-01"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Supplements">Supplements</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProdSellingPrice}
                    onChange={(e) => setNewProdSellingPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm font-bold text-amber-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProdMinAlert}
                    onChange={(e) => setNewProdMinAlert(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors shadow-md shadow-amber-500/20"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PRODUCT */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Product Details</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Selling Price ({activeCurrency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm font-bold text-amber-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stockQuantity}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.minStockAlert ?? 5}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, minStockAlert: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-2 rounded-lg text-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESTOCK PRODUCT */}
      {/* ========================================================================= */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                Restock: {adjustingProduct.name}
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center text-sm">
                <span className="text-zinc-400">Current Stock:</span>
                <span className="font-bold text-white">{adjustingProduct.stockQuantity} units</span>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                  Add Quantity to Stock *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockChangeQuantity}
                  onChange={(e) => setStockChangeQuantity(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white font-bold text-lg text-purple-400 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={stockChangeNotes}
                  onChange={(e) => setStockChangeNotes(e.target.value)}
                  placeholder="e.g. Invoice #2049 from distributor"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors shadow-md shadow-purple-600/20"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT / VIEW RECEIPT */}
      {/* ========================================================================= */}
      {activeReceiptSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header Actions */}
            <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Sale Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setActiveReceiptSale(null)}
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Thermal Receipt Style */}
            <div className="p-6 bg-white text-black font-mono text-xs space-y-3">
              <div className="text-center border-b border-dashed border-gray-400 pb-3">
                {business.logo && (
                  <img
                    src={business.logo}
                    alt={activeGymName}
                    className="w-12 h-12 object-contain mx-auto mb-1.5"
                  />
                )}
                <h2 className="text-base font-black tracking-widest uppercase">{activeGymName}</h2>
                {business.address && (
                  <p className="text-[10px] text-gray-600">{business.address}</p>
                )}
                {business.phone && (
                  <p className="text-[10px] text-gray-600">Tel: {business.phone}</p>
                )}
                <p className="text-[10px] text-gray-500 font-sans mt-1">POS Sales Tax Receipt</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(activeReceiptSale.createdAt).toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-gray-800 mt-1">
                  Invoice: {activeReceiptSale.saleNumber}
                </p>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{activeReceiptSale.customerName}</span>
                </div>
                {activeReceiptSale.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{activeReceiptSale.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="uppercase font-bold">
                    {activeReceiptSale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-gray-400 pb-3">
                {activeReceiptSale.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div>
                      <div>{it.productName}</div>
                      <div className="text-[9px] text-gray-500">
                        {it.quantity} x {currency} {it.unitSellingPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-bold">
                      {currency} {it.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 pt-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>
                    {currency} {activeReceiptSale.subtotal.toLocaleString()}
                  </span>
                </div>
                {activeReceiptSale.discount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Discount:</span>
                    <span>
                      - {currency} {activeReceiptSale.discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                  <span>TOTAL PAID:</span>
                  <span>
                    {currency} {activeReceiptSale.finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-600 space-y-1">
                <p>{activeReceiptFooter}</p>
                <p className="text-[9px] text-gray-400 font-sans">
                  Powered by {activeGymName} POS Engine
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REFUND SALE */}
      {/* ========================================================================= */}
      {refundModalSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Process Sale Refund
              </h3>
              <button
                onClick={() => setRefundModalSale(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-xs text-red-300 space-y-1">
              <p className="font-bold">
                Invoice: {refundModalSale.saleNumber} ({currency}{' '}
                {refundModalSale.finalAmount.toLocaleString()})
              </p>
              <p>
                Refunding this invoice will automatically replenish all sold product quantities
                back into the inventory stock ledger.
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase block mb-1">
                Reason for Refund *
              </label>
              <textarea
                rows={3}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer returned damaged seal or requested refund within 7 days"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRefundModalSale(null)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refunding}
                onClick={handleExecuteRefund}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors shadow-md shadow-red-600/20"
              >
                {refunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
