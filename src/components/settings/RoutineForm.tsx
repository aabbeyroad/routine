import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useRoutineStore } from '../../stores/routineStore';
import { EMOJI_CATEGORIES, SIMPLE_CATEGORIES } from '../../constants/icons';
import SimpleIcon, { isSimpleIcon, getSimpleIconName } from '../common/SimpleIcon';
import type { Routine } from '../../types';

type IconStyle = 'emoji' | 'simple';

interface Props {
  routine?: Routine;
  onClose: () => void;
}

function IconDisplay({ icon, size = 20 }: { icon: string; size?: number }) {
  if (!icon) return null;
  if (isSimpleIcon(icon)) {
    return <SimpleIcon name={getSimpleIconName(icon)} size={size} className="text-primary-600" />;
  }
  return <span style={{ fontSize: size }}>{icon}</span>;
}

export default function RoutineForm({ routine, onClose }: Props) {
  const addRoutine = useRoutineStore((s) => s.addRoutine);
  const updateRoutine = useRoutineStore((s) => s.updateRoutine);
  const keywords = useRoutineStore((s) => s.keywords);

  const [name, setName] = useState(routine?.name || '');
  const [icon, setIcon] = useState(routine?.icon || '');
  const [doneGoal, setDoneGoal] = useState(routine?.doneGoal || '');
  const [moreGoal, setMoreGoal] = useState(routine?.moreGoal || '');
  const [maxGoal, setMaxGoal] = useState(routine?.maxGoal || '');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(routine?.keywords || []);

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconStyle, setIconStyle] = useState<IconStyle>(icon && isSimpleIcon(icon) ? 'simple' : 'emoji');
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) => prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]);
  };

  // 검색 결과
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: string[] = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      if (cat.name.toLowerCase().includes(q)) {
        results.push(...cat.icons.slice(0, 10));
      } else {
        results.push(...cat.icons.filter(() => false)); // emoji는 텍스트 검색 어려움
      }
    });
    // 카테고리명 매칭시 해당 카테고리 아이콘 반환
    const matchedCats = EMOJI_CATEGORIES.filter((c) => c.name.includes(q));
    if (matchedCats.length > 0) return matchedCats.flatMap((c) => c.icons);
    return null;
  }, [searchQuery]);

  const filteredSimple = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: { name: string; label: string }[] = [];
    SIMPLE_CATEGORIES.forEach((cat) => {
      cat.icons.forEach((ic) => {
        if (ic.label.toLowerCase().includes(q) || ic.name.toLowerCase().includes(q) || cat.name.includes(q)) {
          results.push(ic);
        }
      });
    });
    return results.length > 0 ? results : null;
  }, [searchQuery]);

  const currentEmojiCategory = EMOJI_CATEGORIES[categoryIdx] || EMOJI_CATEGORIES[0];
  const currentSimpleCategory = SIMPLE_CATEGORIES[categoryIdx] || SIMPLE_CATEGORIES[0];

  const selectIcon = (value: string) => {
    setIcon(value);
    setShowIconPicker(false);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), icon: icon || '', color: routine?.color || '', doneGoal: doneGoal.trim(), moreGoal: moreGoal.trim(), maxGoal: maxGoal.trim(), keywords: selectedKeywords };
    if (routine) { updateRoutine(routine.id, data); } else { addRoutine(data); }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" role="dialog" aria-labelledby="routine-form-title" onClick={onClose}>
      <div className="bg-surface rounded-t-3xl sm:rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 id="routine-form-title" className="text-lg font-bold">{routine ? '루틴 수정' : '새 루틴'}</h2>
          <button onClick={onClose} aria-label="닫기" className="p-2.5 rounded-xl hover:bg-surface-secondary transition-colors"><X size={20} className="text-text-tertiary" /></button>
        </div>

        <div className="space-y-4">
          {/* 아이콘 + 이름 */}
          <div>
            <label className="block text-[12px] font-medium text-text-tertiary mb-1.5 ml-0.5">루틴 이름</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={`w-[46px] h-[46px] flex-shrink-0 rounded-xl border-2 bg-surface-secondary flex items-center justify-center transition-colors ${showIconPicker ? 'border-primary-500' : 'border-dashed border-border hover:border-primary-400'}`}
                aria-label="아이콘 선택"
              >
                {icon ? <IconDisplay icon={icon} size={22} /> : <span className="text-text-tertiary text-lg">+</span>}
              </button>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 운동하기"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary text-text-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 아이콘 피커 */}
            {showIconPicker && (
              <div className="mt-2 rounded-2xl bg-surface-secondary border border-border overflow-hidden">
                {/* 이모지 / 심플 탭 */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => { setIconStyle('emoji'); setCategoryIdx(0); setSearchQuery(''); }}
                    className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${iconStyle === 'emoji' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-tertiary'}`}
                  >
                    이모지
                  </button>
                  <button
                    onClick={() => { setIconStyle('simple'); setCategoryIdx(0); setSearchQuery(''); }}
                    className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${iconStyle === 'simple' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-tertiary'}`}
                  >
                    심플
                  </button>
                </div>

                {/* 검색 */}
                <div className="p-2.5 pb-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="검색..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface text-[13px] text-text-primary border border-border focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-text-tertiary"
                    />
                  </div>
                </div>

                {/* 카테고리 탭 (검색 중이 아닐 때) */}
                {!searchQuery && (
                  <div className="flex gap-0.5 overflow-x-auto scrollbar-hide px-2.5 pt-2.5 pb-1">
                    {(iconStyle === 'emoji' ? EMOJI_CATEGORIES : SIMPLE_CATEGORIES).map((cat, idx) => (
                      <button
                        key={cat.name}
                        onClick={() => setCategoryIdx(idx)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${categoryIdx === idx ? 'bg-primary-600 text-white' : 'text-text-tertiary hover:bg-surface-tertiary'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* 아이콘 제거 버튼 */}
                {icon && (
                  <div className="px-2.5 pt-1.5">
                    <button onClick={() => selectIcon('')} className="text-[11px] text-red-400 font-medium">아이콘 제거</button>
                  </div>
                )}

                {/* 아이콘 그리드 */}
                <div className="p-2.5 max-h-[200px] overflow-y-auto">
                  {iconStyle === 'emoji' ? (
                    <div className="grid grid-cols-8 gap-1">
                      {(searchQuery && filteredEmojis ? filteredEmojis : currentEmojiCategory.icons).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => selectIcon(emoji)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-[18px] transition-all active:scale-90 ${icon === emoji ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'hover:bg-surface-tertiary'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {searchQuery && !filteredEmojis && (
                        <div className="col-span-8 py-4 text-center text-[12px] text-text-tertiary">결과 없음</div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-1">
                      {(searchQuery && filteredSimple ? filteredSimple : currentSimpleCategory.icons).map((ic) => {
                        const value = `lucide:${ic.name}`;
                        return (
                          <button
                            key={ic.name}
                            onClick={() => selectIcon(value)}
                            className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all active:scale-90 ${icon === value ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'hover:bg-surface-tertiary'}`}
                          >
                            <SimpleIcon name={ic.name} size={20} className={icon === value ? 'text-primary-600' : 'text-text-secondary'} />
                            <span className="text-[9px] text-text-tertiary">{ic.label}</span>
                          </button>
                        );
                      })}
                      {searchQuery && !filteredSimple && (
                        <div className="col-span-6 py-4 text-center text-[12px] text-text-tertiary">결과 없음</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 목표 입력 */}
          <div className="rounded-xl bg-surface-secondary border border-border overflow-hidden divide-y divide-border">
            <div className="flex items-center px-3.5 py-2.5">
              <label className="text-[13px] font-semibold text-done w-16 flex-shrink-0">Done</label>
              <input type="text" value={doneGoal} onChange={(e) => setDoneGoal(e.target.value)} placeholder="최소 목표 (예: 10분)" className="flex-1 text-[14px] text-text-primary bg-transparent focus:outline-none placeholder:text-text-tertiary" />
            </div>
            <div className="flex items-center px-3.5 py-2.5">
              <label className="text-[13px] font-semibold text-more w-16 flex-shrink-0">More</label>
              <input type="text" value={moreGoal} onChange={(e) => setMoreGoal(e.target.value)} placeholder="중간 목표 (예: 30분)" className="flex-1 text-[14px] text-text-primary bg-transparent focus:outline-none placeholder:text-text-tertiary" />
            </div>
            <div className="flex items-center px-3.5 py-2.5">
              <label className="text-[13px] font-semibold text-max w-16 flex-shrink-0">Max</label>
              <input type="text" value={maxGoal} onChange={(e) => setMaxGoal(e.target.value)} placeholder="최대 목표 (예: 1시간)" className="flex-1 text-[14px] text-text-primary bg-transparent focus:outline-none placeholder:text-text-tertiary" />
            </div>
          </div>

          {/* 키워드 */}
          {keywords.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-text-tertiary mb-2 ml-0.5">키워드</label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <button key={kw} onClick={() => toggleKeyword(kw)} className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${selectedKeywords.includes(kw) ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'bg-surface-tertiary text-text-secondary'}`}>{kw}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-sm shadow-primary-600/20">{routine ? '수정하기' : '추가하기'}</button>
      </div>
    </div>
  );
}

export { IconDisplay };
