import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Package,
  ArrowRightLeft,
  Lock,
  X
} from 'lucide-react';
import { StatusBadge, TableSkeletonRows, EmptyState, ConfirmDialog } from './ui';
import ProductDrawer from './ProductDrawer';
import { isAdminUser } from '../utils/permissionUtils';

/**
 * InventoryView - High-Density Enterprise Inventory Management Table
 * - কলাম: Product/SKU, Category, Stock Status (In Stock / Low / Out), Cost Price, Selling Price, Quick Actions
 * - ডানপাশের Slide-Over Drawer দিয়ে পণ্য যোগ ও সম্পাদনা
 * - মোবাইলে (375px) কন্টেইনড স্ট্যাকড কার্ড ও ৪৪px টাচ টার্গেট
 */
export default function InventoryView({
  products = [],
  categories = [],
  units = [],
  suppliers = [],
  currencySymbol = '৳',
  activeUser = null,
  isPinAuthorized = false,
  onRequestAdminUnlock,
  isLoading = false,
  onSubmitProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onAddUnit,
  onQuickRestock,
  onNavigate,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleMobileCount, setVisibleMobileCount] = useState(50);
  const tableParentRef = useRef(null);

  const canSeeCost =
    isAdminUser(activeUser) ||
    isPinAuthorized ||
    (Array.isArray(activeUser?.Permissions) && activeUser.Permissions.includes('canViewBuyingPrice'));

  const categoryList = useMemo(() => {
    const set = new Set();
    (products || []).forEach((p) => {
      if (p.Category) set.add(p.Category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const metrics = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    list.forEach((p) => {
      const s = Number(p.StockQuantity || 0);
      const min = Number(p.MinStockAlert || 5);
      if (s <= 0) outOfStock++;
      else if (s <= min) lowStock++;
      else inStock++;
    });

    return { total: list.length, inStock, lowStock, outOfStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (Array.isArray(products) ? products : []).filter((p) => {
      const s = Number(p.StockQuantity || 0);
      const min = Number(p.MinStockAlert || 5);

      if (stockFilter === 'IN_STOCK' && s <= min) return false;
      if (stockFilter === 'LOW_STOCK' && (s <= 0 || s > min)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && s > 0) return false;

      if (selectedCategory !== 'ALL' && p.Category !== selectedCategory) return false;

      if (!q) return true;
      return (
        String(p.ProductName || '').toLowerCase().includes(q) ||
        String(p.ProductID || '').toLowerCase().includes(q) ||
        String(p.Barcode || '').toLowerCase().includes(q) ||
        String(p.Category || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const formatMoney = (val) => `${currencySymbol}${Number(val || 0).toLocaleString('en-IN')}`;

  useEffect(() => {
    setVisibleMobileCount(50);
  }, [searchQuery, selectedCategory, stockFilter]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalVirtualSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div className="w-full space-y-5">
      {/* হেডার বার */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold font-heading tracking-tight text-[#111111]">
            Inventory Management
          </h1>
          <p className="text-xs text-[#525252] mt-0.5">
            সকল পণ্যের SKU, দোকান ও গোডাউন মজুত, কেনা ও বিক্রয় মূল্য নিয়ন্ত্রণ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('godown_stock')}
              className="min-h-[44px] md:min-h-[36px] px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#525252]" />
              <span>Godown / Transfer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setDrawerOpen(true);
            }}
            className="min-h-[44px] md:min-h-[36px] px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* স্ট্যাটাস ফিল্টার ট্যাব ও সার্চ বার */}
      <div className="bg-white border border-neutral-200/80 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Products', count: metrics.total },
            { id: 'IN_STOCK', label: 'In Stock', count: metrics.inStock },
            { id: 'LOW_STOCK', label: 'Low Stock', count: metrics.lowStock },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock', count: metrics.outOfStock },
          ].map((tab) => {
            const active = stockFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-neutral-100 hover:text-[#111111]'
                }`}
              >
                {tab.label}{' '}
                <span className="font-mono tabular-nums ml-1 opacity-75">({tab.count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, SKU, barcode... (/)"
              className="w-full min-h-[44px] md:min-h-[36px] pl-8 pr-8 py-1.5 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-h-[44px] md:min-h-[36px] px-2.5 py-1.5 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
          >
            {categoryList.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ডেটা টেবিল (Desktop & Tablet) + কার্ড ভিউ (Mobile 375px) */}
      {isLoading ? (
        <TableSkeletonRows rows={8} cols={6} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="কোনো পণ্য পাওয়া যায়নি"
          description="অনুসন্ধান বা ফিল্টার পরিবর্তন করুন অথবা নতুন পণ্য যোগ করুন।"
          actionLabel="Add New Product"
          onAction={() => {
            setEditingProduct(null);
            setDrawerOpen(true);
          }}
        />
      ) : (
        <>
          {/* Desktop Virtualized High-Density Table */}
          <div className="hidden md:block bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[#FAFAFA] border-b border-neutral-200/80 flex items-center justify-between text-[11px] text-[#737373] font-mono tabular-nums">
              <span>Showing {filteredProducts.length} of {products.length} products</span>
              <span>Virtualized Scroll</span>
            </div>
            <div ref={tableParentRef} className="overflow-auto max-h-[calc(100vh-20rem)] min-h-[260px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#FAFAFA] border-b border-neutral-200/80 text-[#525252] text-[11px] font-medium">
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80">
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={6} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const prod = filteredProducts[virtualRow.index];
                    if (!prod) return null;
                    const shopStock = Number(prod.StockQuantity || 0);
                    const godownStock = Number(prod.GodownStock || 0);
                    const minAlert = Number(prod.MinStockAlert || 5);
                    const statusVariant =
                      shopStock <= 0 ? 'danger' : shopStock <= minAlert ? 'warning' : 'success';
                    const statusLabel =
                      shopStock <= 0 ? 'Out of Stock' : shopStock <= minAlert ? 'Low Stock' : 'In Stock';

                    return (
                      <tr
                        key={prod.ProductID || virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                              {prod.ImageUrl ? (
                                <img
                                  src={prod.ImageUrl}
                                  alt={prod.ProductName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-[#737373]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[#111111] truncate max-w-xs">
                                {prod.ProductName}
                              </div>
                              <div className="text-[10.5px] font-mono tabular-nums text-[#737373]">
                                {prod.ProductID}
                                {prod.Barcode ? ` • #${prod.Barcode}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[#525252]">
                          <span>{prod.Category || 'General'}</span>
                          {prod.Unit && (
                            <span className="block text-[10.5px] text-[#737373] font-mono">
                              Unit: {prod.Unit}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
                            <span className="font-mono tabular-nums text-[11px] text-[#525252]">
                              S:{shopStock} / G:{godownStock}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#525252]">
                          {canSeeCost ? (
                            formatMoney(prod.CostPrice)
                          ) : (
                            <button
                              type="button"
                              onClick={onRequestAdminUnlock}
                              className="inline-flex items-center gap-1 text-[#737373] hover:text-[#111111] cursor-pointer"
                            >
                              <span>••••</span>
                              <Lock className="w-3 h-3" />
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#111111]">
                          {formatMoney(prod.SellingPrice)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {onQuickRestock && (
                              <button
                                type="button"
                                onClick={() => onQuickRestock(prod)}
                                title="Restock"
                                className="min-h-[32px] px-2.5 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[11px] font-medium text-[#111111] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Restock</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(prod);
                                setDrawerOpen(true);
                              }}
                              title="Edit in Drawer"
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[#525252] hover:text-[#111111] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(prod)}
                              title="Delete"
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white hover:bg-red-50 text-[#525252] hover:text-[#B91C1C] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={6} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards (375px - Zero Horizontal Overflow) */}
          <div className="md:hidden space-y-2.5">
            {filteredProducts.slice(0, visibleMobileCount).map((prod) => {
              const shopStock = Number(prod.StockQuantity || 0);
              const minAlert = Number(prod.MinStockAlert || 5);
              const statusVariant =
                shopStock <= 0 ? 'danger' : shopStock <= minAlert ? 'warning' : 'success';
              const statusLabel =
                shopStock <= 0 ? 'Out' : shopStock <= minAlert ? 'Low' : 'In Stock';

              return (
                <div
                  key={prod.ProductID}
                  className="bg-white border border-neutral-200/80 rounded-lg p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[#111111] truncate">{prod.ProductName}</h3>
                      <p className="text-[11px] font-mono tabular-nums text-[#737373]">
                        {prod.ProductID} • {prod.Category || 'General'}
                      </p>
                    </div>
                    <StatusBadge variant={statusVariant} mono>
                      {statusLabel} ({shopStock})
                    </StatusBadge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                    <div>
                      <span className="text-[#737373]">Price: </span>
                      <span className="font-mono tabular-nums font-semibold text-[#111111]">
                        {formatMoney(prod.SellingPrice)}
                      </span>
                    </div>
                    {canSeeCost && (
                      <div>
                        <span className="text-[#737373]">Cost: </span>
                        <span className="font-mono tabular-nums text-[#525252]">
                          {formatMoney(prod.CostPrice)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(prod);
                        setDrawerOpen(true);
                      }}
                      className="min-h-[44px] rounded-md border border-neutral-200/80 bg-white text-xs font-medium text-[#111111] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {onQuickRestock && (
                      <button
                        type="button"
                        onClick={() => onQuickRestock(prod)}
                        className="min-h-[44px] rounded-md border border-neutral-200/80 bg-white text-xs font-medium text-[#111111] inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(prod)}
                      className="min-h-[44px] rounded-md border border-red-200 bg-red-50 text-xs font-medium text-[#B91C1C] inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length > visibleMobileCount && (
              <button
                type="button"
                onClick={() => setVisibleMobileCount((c) => c + 50)}
                className="w-full min-h-[44px] py-2 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] font-mono tabular-nums cursor-pointer"
              >
                Load More ({filteredProducts.length - visibleMobileCount} remaining)
              </button>
            )}
          </div>
        </>
      )}

      {/* স্লাইড-ওভার প্রোডাক্ট ড্রয়ার (Add / Edit) */}
      <ProductDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        currencySymbol={currencySymbol}
        onSubmitProduct={onSubmitProduct}
        onSubmitUpdate={onUpdateProduct}
        categories={categories}
        onAddCategory={onAddCategory}
        units={units}
        onAddUnit={onAddUnit}
        suppliers={suppliers}
        products={products}
      />

      {/* পণ্য ডিলিট কনফার্মেশন */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            const pid = deleteTarget.ProductID;
            setDeleteTarget(null);
            await onDeleteProduct(pid);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="পণ্যটি ডিলিট করতে চান?"
        message={
          deleteTarget
            ? `"${deleteTarget.ProductName}" (${deleteTarget.ProductID}) লোকাল স্টোরেজ ও গুগল শিট থেকে মুছে ফেলা হবে।`
            : ''
        }
        confirmLabel="Delete Product"
        isDestructive={true}
        isProcessing={isDeleting}
      />
    </div>
  );
}
