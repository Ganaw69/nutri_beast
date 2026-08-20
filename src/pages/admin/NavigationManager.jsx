import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { categoryService } from '../../services/api';
import { buildCategoryTree, extractCategoryItems } from '../../utils/categoryTree';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  RotateCcw,
  Settings2,
  EyeOff,
  ChevronDown,
  FolderTree,
} from 'lucide-react';

export const NavigationManager = () => {
  const { categoryNavigation, updateCategoryNavigation } = useAdmin();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    categoryService.getAll({
      isActive: true,
      pagination: false,
      'order[position]': 'asc',
      'order[name]': 'asc',
    })
      .then((data) => {
        if (!alive) return;
        setCategories(extractCategoryItems(data));
      })
      .catch(() => {
        if (!alive) return;
        setCategories([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories.filter((category) => category.isActive !== false)),
    [categories]
  );

  const topLevelCategories = useMemo(() => {
    const visibleIds = new Set(categoryNavigation.hiddenTopLevelCategoryIds || []);
    const customOrder = categoryNavigation.topLevelOrder || [];
    const topLevel = categoryTree.filter((item) => !visibleIds.has(item.id));

    if (customOrder.length === 0) return topLevel;

    const byId = new Map(topLevel.map((item) => [item.id, item]));
    const ordered = customOrder.map((id) => byId.get(id)).filter(Boolean);
    const remaining = topLevel.filter((item) => !customOrder.includes(item.id));
    return [...ordered, ...remaining];
  }, [categoryTree, categoryNavigation.hiddenTopLevelCategoryIds, categoryNavigation.topLevelOrder]);

  const activeCategory = topLevelCategories.find((item) => item.id === selectedId) || topLevelCategories[0] || null;

  useEffect(() => {
    if (!selectedId && topLevelCategories.length > 0) {
      setSelectedId(topLevelCategories[0].id);
    }
  }, [selectedId, topLevelCategories]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(topLevelCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateCategoryNavigation({
      ...categoryNavigation,
      topLevelOrder: items.map((item) => item.id),
    });
  };

  const toggleVisible = (id) => {
    const hidden = new Set(categoryNavigation.hiddenTopLevelCategoryIds || []);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);

    updateCategoryNavigation({
      ...categoryNavigation,
      hiddenTopLevelCategoryIds: [...hidden],
    });
  };

  const resetNavigation = () => {
    updateCategoryNavigation({
      hiddenTopLevelCategoryIds: [],
      topLevelOrder: [],
    });
  };

  const activeChildren = activeCategory?.children || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#111]">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Category Navigation</h1>
          <p className="text-gray-400 text-sm">
            The storefront navbar is built from parent categories. Child categories appear as dropdowns automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetNavigation}
            className="px-4 py-2 border border-[#333] hover:bg-[#222] text-white rounded font-medium text-sm transition-colors flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-[#e60033] hover:bg-[#ff1a4d] text-white rounded font-bold text-sm transition-colors flex items-center gap-2"
          >
            <Settings2 size={16} />
            Using categories
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 flex flex-col bg-[#161616] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#2a2a2a] text-xs font-bold text-gray-500 uppercase tracking-widest bg-[#1a1a1a]">
            <div className="col-span-6">Parent category</div>
            <div className="col-span-4">Children in dropdown</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading categories...</div>
            ) : topLevelCategories.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No active parent categories yet. Create them in the Categories screen.
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="top-level-categories">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {topLevelCategories.map((category, index) => (
                        <Draggable key={category.id} draggableId={String(category.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group rounded-lg border ${
                                selectedId === category.id ? 'border-[#e60033] bg-[#1c1c1c]' : 'border-transparent bg-[#1a1a1a]'
                              } ${snapshot.isDragging ? 'shadow-xl' : ''}`}
                            >
                              <div
                                className="grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer hover:bg-[#222] rounded-lg"
                                onClick={() => setSelectedId(category.id)}
                              >
                                <div className="col-span-6 flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="text-[#444] hover:text-gray-300">
                                    <GripVertical size={16} />
                                  </div>
                                  <FolderTree size={16} className="text-[#d90429]" />
                                  <div>
                                    <div className="font-bold text-white">{category.name}</div>
                                    <div className="text-xs text-gray-500">{category.slug || 'No slug'}</div>
                                  </div>
                                </div>

                                <div className="col-span-4 text-sm text-gray-400">
                                  {category.children?.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <ChevronDown size={14} />
                                      <span>{category.children.length} subcategories</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-600">No dropdown items</span>
                                  )}
                                </div>

                                <div className="col-span-2 text-right flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVisible(category.id);
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                      (categoryNavigation.hiddenTopLevelCategoryIds || []).includes(category.id)
                                        ? 'bg-gray-500/10 text-gray-400'
                                        : 'bg-emerald-500/10 text-emerald-400'
                                    }`}
                                  >
                                    {(categoryNavigation.hiddenTopLevelCategoryIds || []).includes(category.id) ? 'Hidden' : 'Visible'}
                                  </button>
                                  {(categoryNavigation.hiddenTopLevelCategoryIds || []).includes(category.id) && (
                                    <EyeOff size={14} className="text-gray-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          <div className="border-t border-[#2a2a2a] bg-[#1a1a1a] p-4 flex items-center justify-between">
            <div className="text-gray-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
              The navbar reads this structure automatically.
            </div>
            <div className="text-xs text-gray-500">
              Drag parents to reorder them in the header.
            </div>
          </div>
        </div>

        <div className="w-[340px] flex flex-col gap-6">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Header Preview</h3>
              <Settings2 size={18} className="text-gray-500" />
            </div>

            {activeCategory ? (
              <div className="space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <div className="text-xs uppercase text-gray-500 font-bold mb-1">Main item</div>
                  <div className="text-white font-bold">{activeCategory.name}</div>
                </div>

                <div>
                  <div className="text-xs uppercase text-gray-500 font-bold mb-2">Dropdown children</div>
                  {activeChildren.length === 0 ? (
                    <div className="text-sm text-gray-500">This parent has no subcategories yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {activeChildren.map((child) => (
                        <div key={child.id} className="flex items-center justify-between rounded-md bg-[#111] border border-[#2a2a2a] px-3 py-2">
                          <span className="text-sm text-gray-200">{child.name}</span>
                          <span className="text-[10px] uppercase text-gray-500 font-bold">Dropdown</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Select a parent category to preview its dropdown children.</div>
            )}
          </div>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-5">
            <h3 className="font-bold text-white mb-3">How this works</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>1. Create parent categories in the Categories screen.</p>
              <p>2. Add subcategories under each parent.</p>
              <p>3. The navbar shows parent categories as the main menu.</p>
              <p>4. The dropdown list is made from the child subcategories.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
